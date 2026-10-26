import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from services import (
    ChunkService,
    EmbeddingRequest,
    EmbeddingService,
    DocumentContext,
    S3Service,
    TagCandidates,
    TagService,
    TagRefinerService,
    TagWindowBuffer,
    VectorObject,
    VectorMetadata,
    VectorService,
    DynamoService,
    Object,
    PdfOcrRequiredError,
    build_id_with_prefix,
    decode_s3_key
)

PDF_OCR_REQUIRED_MESSAGE = (
    "Este PDF parece ser um documento digitalizado (imagem). "
    "Ainda não conseguimos extrair texto desse tipo de arquivo."
)

FAILED_OBJECT_TTL_MINUTES = 10
# Padrões (variáveis TAG_MAX_LENGTH e TAG_REFINER_MAX_CANDIDATES). Tamanho máximo de uma tag, em
# caracteres: o backend em Go usa a mesma variável (TAG_MAX_LENGTH) e corta tag maior numa edição.
MAX_TAG_LENGTH = 32
# Teto de candidatas enviadas ao refinador. A lista sai intercalada por faixa do documento (ver
# TagCandidates), então o corte tira de todas as partes do livro, não só do fim.
TAG_REFINER_MAX_CANDIDATES = 1000
# Padrão de TAG_WINDOW_CHARS: 0 extrai tags página por página; um valor positivo junta páginas
# seguidas até esse tamanho antes de extrair (ver TagWindowBuffer), dando ao YAKE um texto maior
# pra reconhecer um conceito que se repete.
TAG_WINDOW_CHARS = 8000


def _clip_tags(tags: list[str], max_length: int = MAX_TAG_LENGTH) -> list[str]:
    # Tag que não cabe é descartada, nunca cortada: cortar deixava palavra pela metade.
    seen: set[str] = set()
    kept: list[str] = []
    for tag in tags:
        value = tag.strip()
        if not value or len(value) > max_length or value in seen:
            continue
        seen.add(value)
        kept.append(value)
    return kept

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class HandlerData:
    s3_service: S3Service
    tag_service: TagService
    embedding_service: EmbeddingService
    vector_service: VectorService
    chunk_service: ChunkService
    dynamo_service: DynamoService
    tag_refiner: TagRefinerService
    tag_refiner_max_candidates: int = TAG_REFINER_MAX_CANDIDATES
    tag_max_length: int = MAX_TAG_LENGTH
    tag_window_chars: int = TAG_WINDOW_CHARS


class ProcessorHandler:
    def __init__(self, config: HandlerData):
        self.s3_service = config.s3_service
        self.tag_service = config.tag_service
        self.embedding_service = config.embedding_service
        self.vector_service = config.vector_service
        self.chunk_service = config.chunk_service
        self.dynamo_service = config.dynamo_service
        self.tag_refiner = config.tag_refiner
        self.tag_refiner_max_candidates = config.tag_refiner_max_candidates
        self.tag_max_length = config.tag_max_length
        self.tag_window_chars = config.tag_window_chars

    def process_all(self, records: list[dict]) -> None:
        total_records = len(records)
        logger.info(f"Starting orchestration for {total_records} record(s).")

        for index, record in enumerate(records, start=1):
            try:
                self.process_record(record)
            except Exception:
                logger.exception(f"Failed processing record {index}/{total_records}. Raw record={record}")

        logger.info("Finished processing all records.")

    def process_record(self, record: dict) -> None:
        s3_events = self._extract_s3_events(record)

        for s3_event in s3_events:
            try:
                event_name = s3_event["eventName"]
                bucket = s3_event["s3"]["bucket"]["name"]
                key = decode_s3_key(s3_event["s3"]["object"]["key"])
            except KeyError as e:
                logger.error(f"Malformed S3 event. Missing key={e}")
                continue

            if event_name.startswith("ObjectRemoved"):
                self._handle_delete_event(bucket=bucket, object_key=key)
            elif event_name.startswith("ObjectCreated"):
                self._handle_create_event(bucket=bucket, object_key=key)
            else:
                logger.warning(f"Unsupported event type: {event_name}")

    def _handle_create_event(self, bucket: str, object_key: str) -> None:
        logger.info(f"Starting ingestion pipeline for s3://{bucket}/{object_key}")

        user_id = self._extract_user_from_key(object_key)
        if not user_id:
            logger.error(f"Failed extracting user_id from key={object_key}")
            return

        object_name = self._extract_object_name_from_key(object_key)
        if not object_name:
            logger.error(f"Failed extracting object name from key={object_key}")
            return

        object_id = build_id_with_prefix("obj")
        created_at = datetime.now(UTC).isoformat()

        try:
            self.dynamo_service.save_object(
                Object(
                    id=object_id,
                    name=object_name,
                    key=object_key,
                    user_id=user_id,
                    tags=[],
                    status="processing",
                    created_at=created_at,
                    vector_ids=[],
                )
            )
        except Exception:
            logger.exception(f"Failed saving initial 'processing' record for s3://{bucket}/{object_key}")
            return

        vector_save_result = None

        try:
            total_pages = 0
            total_chunks = 0
            tag_candidates = TagCandidates()
            # None (TAG_WINDOW_CHARS=0) extrai tags de cada página sozinha; com um valor positivo,
            # as páginas são acumuladas até esse tamanho antes de extrair (ver TagWindowBuffer).
            tag_window = TagWindowBuffer(self.tag_window_chars) if self.tag_window_chars > 0 else None
            vector_objects: list[VectorObject] = []

            # Atualizado só quando uma extração de tags termina (a cada página, ou a cada janela
            # fechada); os chunks embedados entre uma atualização e outra usam o último idioma
            # conhecido -- o campo é só informativo (ver VectorMetadata), nenhuma busca filtra por
            # ele, então essa imprecisão não tem efeito prático.
            page_language = "unknown"

            for content in self.s3_service.get_file_content(bucket=bucket, key=object_key):
                total_pages += 1
                page = content.page
                text = content.text

                unit_text = tag_window.add(text) if tag_window is not None else text
                if unit_text is not None:
                    page_language = self._extract_tags(object_key, page, unit_text, tag_candidates)

                for chunk in self.chunk_service.chunk(text):
                    total_chunks += 1
                    try:
                        embedding_result = self.embedding_service.generate_embedding(
                            EmbeddingRequest(chunk_text=chunk.text, chunk_index=chunk.index, object_key=object_key)
                        )
                    except Exception:
                        logger.exception(f"[{object_key}] Failed generating embedding for page={page} chunk={chunk.index}")
                        continue

                    metadata = VectorMetadata(
                        user=user_id,
                        object_key=object_key,
                        page=page,
                        chunk_index=chunk.index,
                        language=page_language,
                        chunk=chunk.text
                    )

                    vector_objects.append(
                        VectorObject(chunk=chunk, embedding=embedding_result.vector, metadata=metadata)
                    )

            if tag_window is not None:
                remainder = tag_window.flush()
                if remainder is not None:
                    self._extract_tags(object_key, total_pages, remainder, tag_candidates)

            if not vector_objects:
                raise RuntimeError(f"No vectors generated for s3://{bucket}/{object_key}")

            # Uma chamada ao refinador por faixa do documento, não uma com tudo: assim a
            # cobertura não depende de o modelo chegar ao fim de uma lista gigante.
            bands = tag_candidates.bands(self.tag_refiner_max_candidates)
            refiner_context = DocumentContext(
                language=tag_candidates.dominant_language(),
                filename=object_name,
            )
            logger.info(
                f"[{object_key}] Tag candidates: {len(tag_candidates)} unique, "
                f"{sum(len(band) for band in bands)} sent to the refiner in {len(bands)} band(s), "
                f"language={refiner_context.language}."
            )
            refined_tags = self.tag_refiner.refine(bands, refiner_context)
            refined_tags = _clip_tags(refined_tags, self.tag_max_length)

            vector_save_result = self.vector_service.save(vector_objects, object_id=object_id)
            logger.info(f"Successfully saved {len(vector_objects)} vectors for s3://{bucket}/{object_key}")

            self.dynamo_service.save_object(
                Object(
                    id=object_id,
                    name=object_name,
                    key=object_key,
                    user_id=user_id,
                    tags=refined_tags,
                    status="active",
                    created_at=created_at,
                    vector_ids=vector_save_result.vector_ids,
                )
            )

            logger.info(f"Ingestion completed for s3://{bucket}/{object_key}. Pages={total_pages}, Chunks={total_chunks}")

        except PdfOcrRequiredError:
            logger.warning(f"PDF requires OCR (unsupported) for s3://{bucket}/{object_key}")
            self._handle_ingestion_failure(
                bucket=bucket,
                object_key=object_key,
                object_id=object_id,
                object_name=object_name,
                user_id=user_id,
                created_at=created_at,
                vector_ids=[],
                error_message=PDF_OCR_REQUIRED_MESSAGE,
            )
        except Exception:
            logger.exception(f"Ingestion failed for s3://{bucket}/{object_key}")
            self._handle_ingestion_failure(
                bucket=bucket,
                object_key=object_key,
                object_id=object_id,
                object_name=object_name,
                user_id=user_id,
                created_at=created_at,
                vector_ids=vector_save_result.vector_ids if vector_save_result else [],
            )

    def _extract_tags(self, object_key: str, page: int, text: str, tag_candidates: TagCandidates) -> str:
        """Extrai as tags de uma unidade de texto (uma página, ou uma janela de várias páginas) e
        as acrescenta a `tag_candidates`. Devolve o idioma detectado, ou "unknown" se a extração
        falhar -- nesse caso a unidade ainda conta na posição do documento, só sem candidatas."""
        try:
            tag_result = self.tag_service.get_tags(text)
            tag_candidates.add_page(tag_result.tags, tag_result.language)
            return tag_result.language
        except Exception:
            logger.exception(f"[{object_key}] Failed extracting tags ending at page={page}")
            tag_candidates.add_page([])
            return "unknown"

    def _handle_ingestion_failure(
        self,
        bucket: str,
        object_key: str,
        object_id: str,
        object_name: str,
        user_id: str,
        created_at: str,
        vector_ids: list[str],
        error_message: str | None = None,
    ) -> None:
        if vector_ids:
            try:
                self.vector_service.delete(vector_ids)
            except Exception:
                logger.exception(f"Failed cleaning up orphaned vectors for s3://{bucket}/{object_key}")

        ttl = int((datetime.now(UTC) + timedelta(minutes=FAILED_OBJECT_TTL_MINUTES)).timestamp())

        try:
            self.dynamo_service.save_object(
                Object(
                    id=object_id,
                    name=object_name,
                    key=object_key,
                    user_id=user_id,
                    tags=[],
                    status="failed",
                    created_at=created_at,
                    vector_ids=[],
                    ttl=ttl,
                    error_message=error_message,
                )
            )
        except Exception:
            logger.exception(f"Failed saving 'failed' record for s3://{bucket}/{object_key}")
            return

        try:
            self.s3_service.delete_file(bucket=bucket, key=object_key)
        except Exception:
            logger.exception(f"Failed deleting S3 object after ingestion failure s3://{bucket}/{object_key}")

    def _handle_delete_event(self, bucket: str, object_key: str) -> None:
        pass

    def _extract_user_from_key(self, key: str) -> str | None:
        parts = key.split("/")
        if len(parts) < 3:
            logger.warning(f"Unexpected S3 key format: {key}")
            return None
        return parts[1]

    def _extract_object_name_from_key(self, key: str) -> str | None:
        # A API dá a cada upload sua própria "pasta" (id único) dentro de
        # tenants/{userId}/context/ -- tenants/{userId}/context/{id único}/{nome escolhido
        # pelo usuário} -- pra garantir uma chave S3 exclusiva por upload sem precisar
        # fundir id e nome num único segmento (ver buildStorageObjectName em
        # handler/storage.go). O nome de exibição do objeto já é, portanto, só o último
        # segmento do caminho -- sem nenhum parsing extra de string.
        parts = key.split("/")
        if len(parts) < 3:
            return None
        return parts[-1]

    def _extract_s3_events(self, record: dict) -> list[dict]:
        if "body" not in record:
            return [record]
        
        body = json.loads(record["body"])
        return body.get("Records", [])
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
    TagService,
    TagRefinerService,
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
# Padrão de TAG_MAX_LENGTH. Tamanho máximo de uma tag, em caracteres: o backend em Go usa a
# mesma variável e corta tag maior numa edição.
MAX_TAG_LENGTH = 32


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
    tag_max_length: int = MAX_TAG_LENGTH


class ProcessorHandler:
    def __init__(self, config: HandlerData):
        self.s3_service = config.s3_service
        self.tag_service = config.tag_service
        self.embedding_service = config.embedding_service
        self.vector_service = config.vector_service
        self.chunk_service = config.chunk_service
        self.dynamo_service = config.dynamo_service
        self.tag_refiner = config.tag_refiner
        self.tag_max_length = config.tag_max_length

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
            # O texto de todas as páginas, para o YAKE ler o documento inteiro de uma vez no fim.
            page_texts: list[str] = []
            vector_objects: list[VectorObject] = []

            for content in self.s3_service.get_file_content(bucket=bucket, key=object_key):
                total_pages += 1
                page = content.page
                text = content.text
                page_texts.append(text)

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
                        # Preenchido com o idioma do documento depois da extração de tags.
                        language="unknown",
                        chunk=chunk.text
                    )

                    vector_objects.append(
                        VectorObject(chunk=chunk, embedding=embedding_result.vector, metadata=metadata)
                    )

            if not vector_objects:
                raise RuntimeError(f"No vectors generated for s3://{bucket}/{object_key}")

            # O YAKE roda uma vez sobre o texto do documento inteiro, e as candidatas vão ao
            # refinador numa chamada só.
            language, candidates = self._extract_tags(object_key, "\n".join(page_texts))
            for vector_object in vector_objects:
                vector_object.metadata.language = language

            refiner_context = DocumentContext(
                language=language if language != "unknown" else None,
                filename=object_name,
            )
            logger.info(
                f"[{object_key}] Tag candidates: {len(candidates)} sent to the refiner, language={language}."
            )
            refined_tags = self.tag_refiner.refine(candidates, refiner_context)
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

    def _extract_tags(self, object_key: str, text: str) -> tuple[str, list[str]]:
        """Extrai as candidatas do texto do documento inteiro. Devolve o idioma detectado e as
        candidatas, ou ("unknown", []) se a extração falhar: o documento ainda é indexado, só
        sem tags."""
        try:
            tag_result = self.tag_service.get_tags(text)
            return tag_result.language, [tag.value for tag in tag_result.tags]
        except Exception:
            logger.exception(f"[{object_key}] Failed extracting tags from the document")
            return "unknown", []

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
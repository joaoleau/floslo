import json
import logging
from dataclasses import dataclass
from pathlib import Path

from langsmith import traceable

from services import (
    ChunkService,
    EmbeddingRequest,
    EmbeddingService,
    StorageService,
    TagRefinerService,
    TagService,
    VectorObject,
    VectorMetadata,
    VectorStore,
    MetadataStore,
    Object,
    build_id_with_prefix
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@dataclass(slots=True)
class HandlerData:
    storage_service: StorageService
    tag_service: TagService
    tag_refiner: TagRefinerService
    embedding_service: EmbeddingService
    vector_store: VectorStore
    chunk_service: ChunkService
    metadata_store: MetadataStore
    reports_dir: Path | None = None


class ProcessorHandler:
    """Local counterpart of handlers/processor.py's ProcessorHandler.

    Instead of reacting to S3 event records, it takes a flat list of local
    file keys (paths relative to the input dir, e.g. "demo-user/file.txt")
    and runs the same tag -> refine -> chunk -> embed -> save pipeline per
    file.
    """

    def __init__(self, config: HandlerData):
        self.storage_service = config.storage_service
        self.tag_service = config.tag_service
        self.tag_refiner = config.tag_refiner
        self.embedding_service = config.embedding_service
        self.vector_store = config.vector_store
        self.chunk_service = config.chunk_service
        self.metadata_store = config.metadata_store
        self.reports_dir = config.reports_dir

    def process_all(self, keys: list[str], bucket: str = "local") -> None:
        total = len(keys)
        logger.info(f"Starting orchestration for {total} file(s).")

        for index, key in enumerate(keys, start=1):
            try:
                self._handle_create_event(bucket=bucket, object_key=key)
            except Exception:
                logger.exception(f"Failed processing file {index}/{total}. key={key}")

        logger.info("Finished processing all files.")

    @traceable(run_type="chain", name="process_document")
    def _handle_create_event(self, bucket: str, object_key: str) -> None:
        logger.info(f"Starting ingestion pipeline for {bucket}/{object_key}")

        user_id = self._extract_user_from_key(object_key)
        if not user_id:
            logger.error(f"Failed extracting user_id from key={object_key}")
            return

        total_pages = 0
        total_chunks = 0
        all_tags: set[str] = set()
        vector_objects: list[VectorObject] = []
        pages_report: list[dict] = []

        for content in self.storage_service.get_file_content(bucket=bucket, key=object_key):
            total_pages += 1
            page = content.page
            text = content.text

            language = "unknown"
            yake_tags: list[str] = []
            refined_tags: list[str] = []
            try:
                tag_result = self.tag_service.get_tags(text)
                language = tag_result.language
                yake_tags = [tag.value for tag in tag_result.tags]
                refined_tags = self.tag_refiner.refine(yake_tags, text)
                all_tags.update(refined_tags)
            except Exception:
                logger.exception(f"[{object_key}] Failed extracting/refining tags for page={page}")

            page_chunks_report: list[dict] = []

            for chunk in self.chunk_service.chunk(text, file_type=content.file_type):
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
                    language=language,
                    chunk=chunk.text,
                    headers=chunk.headers
                )

                vector_objects.append(
                    VectorObject(chunk=chunk, embedding=embedding_result.vector, metadata=metadata)
                )

                page_chunks_report.append({
                    "index": chunk.index,
                    "length": len(chunk.text),
                    "text": chunk.text,
                    "headers": chunk.headers,
                    "embedding_dimensions": embedding_result.dimensions
                })

            pages_report.append({
                "page": page,
                "file_type": content.file_type,
                "language": language,
                "tags_yake": yake_tags,
                "tags_refined": refined_tags,
                "text_length": len(text),
                "chunk_count": len(page_chunks_report),
                "chunks": page_chunks_report
            })

        if not vector_objects:
            logger.warning(f"No vectors generated for {bucket}/{object_key}")
            return

        self.vector_store.save(vector_objects)
        logger.info(f"Successfully saved {len(vector_objects)} vectors for {bucket}/{object_key}")

        object_id = build_id_with_prefix("obj")
        try:
            object_name = self._extract_object_name_from_key(object_key)
            self.metadata_store.save_object(
                Object(
                    id=object_id,
                    name=object_name,
                    key=object_key,
                    user_id=user_id,
                    tags=list(all_tags),
                    status="active",
                    created_at=None,
                )
            )
        except Exception:
            logger.exception(f"Failed saving metadata for {bucket}/{object_key}")
            raise

        self._write_debug_report(
            object_id=object_id,
            object_key=object_key,
            user_id=user_id,
            total_pages=total_pages,
            total_chunks=total_chunks,
            tags=list(all_tags),
            pages_report=pages_report
        )

        logger.info(f"Ingestion completed for {object_key}. Pages={total_pages}, Chunks={total_chunks}")

    def _write_debug_report(
        self,
        object_id: str,
        object_key: str,
        user_id: str,
        total_pages: int,
        total_chunks: int,
        tags: list[str],
        pages_report: list[dict]
    ) -> None:
        if self.reports_dir is None:
            return

        self.reports_dir.mkdir(parents=True, exist_ok=True)
        safe_name = object_key.replace("/", "__")
        report_path = self.reports_dir / f"{safe_name}.json"

        report = {
            "object_id": object_id,
            "object_key": object_key,
            "user_id": user_id,
            "total_pages": total_pages,
            "total_chunks": total_chunks,
            "tags": tags,
            "pages": pages_report
        }

        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"Wrote debug report to '{report_path}'")

    def _extract_user_from_key(self, key: str) -> str | None:
        parts = key.split("/")
        if len(parts) < 2:
            logger.warning(f"Unexpected key format (expected '<user_id>/<filename>'): {key}")
            return None
        return parts[0]

    def _extract_object_name_from_key(self, key: str) -> str | None:
        parts = key.split("/")
        return parts[-1] if parts else None

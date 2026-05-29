import json
import logging
from dataclasses import dataclass

from services import (
    ChunkService,
    EmbeddingRequest,
    EmbeddingService,
    S3Service,
    TagService,
    VectorObject,
    VectorMetadata,
    VectorService,
    DynamoService,
    Object,
    build_id_with_prefix
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

@dataclass(slots=True)
class HandlerData:
    s3_service: S3Service
    tag_service: TagService
    embedding_service: EmbeddingService
    vector_service: VectorService
    chunk_service: ChunkService
    dynamo_service: DynamoService


class ProcessorHandler:
    def __init__(self, config: HandlerData):
        self.s3_service = config.s3_service
        self.tag_service = config.tag_service
        self.embedding_service = config.embedding_service
        self.vector_service = config.vector_service
        self.chunk_service = config.chunk_service
        self.dynamo_service = config.dynamo_service

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
                key = s3_event["s3"]["object"]["key"]
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

        total_pages = 0
        total_chunks = 0
        all_tags: set[str] = set()
        vector_objects: list[VectorObject] = []

        for content in self.s3_service.get_file_content(bucket=bucket, key=object_key):
            total_pages += 1
            page = content.page
            text = content.text

            try:
                tag_result = self.tag_service.get_tags(text)
                all_tags.update([tag.value for tag in tag_result.tags])
            except Exception:
                logger.exception(f"[{object_key}] Failed extracting tags for page={page}")

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
                    language=tag_result.language,
                    chunk=chunk.text
                )

                vector_objects.append(
                    VectorObject(chunk=chunk, embedding=embedding_result.vector, metadata=metadata)
                )

        if not vector_objects:
            logger.warning(f"No vectors generated for s3://{bucket}/{object_key}")
            return

        self.vector_service.save(vector_objects)
        logger.info(f"Successfully saved {len(vector_objects)} vectors for s3://{bucket}/{object_key}")

        try:
            object_name = self._extract_object_name_from_key(object_key)
            self.dynamo_service.save_object(
                Object(
                    id=build_id_with_prefix("obj"),
                    name=object_name,
                    key=object_key,
                    user_id=user_id,
                    tags=list(all_tags),
                    status="active",
                    created_at=None,
                )
            )
        except Exception:
            logger.exception(f"Failed saving DynamoDB metadata for s3://{bucket}/{object_key}")
            raise

        logger.info(f"Ingestion completed for s3://{bucket}/{object_key}. Pages={total_pages}, Chunks={total_chunks}")

    def _handle_delete_event(self, bucket: str, object_key: str) -> None:
        pass

    def _extract_user_from_key(self, key: str) -> str | None:
        parts = key.split("/")
        if len(parts) < 3:
            logger.warning(f"Unexpected S3 key format: {key}")
            return None
        return parts[1]

    def _extract_object_name_from_key(self, key: str) -> str | None:
        parts = key.split("/")
        if len(parts) < 3:
            return None
        return parts[-1]

    def _extract_s3_events(self, record: dict) -> list[dict]:
        if "body" not in record:
            return [record]
        
        body = json.loads(record["body"])
        return body.get("Records", [])
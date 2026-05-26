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
    ObjectResult,
    ObjectRecord
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


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

    def process_all(
        self,
        records: list[dict]
    ) -> None:

        total_records = len(records)

        logger.info(
            f"Starting orchestration for "
            f"{total_records} record(s)."
        )

        for index, record in enumerate(
            records,
            start=1
        ):

            logger.debug(
                f"Processing record "
                f"{index}/{total_records}"
            )

            try:
                self.process_record(record)

            except Exception:
                logger.exception(
                    f"Failed processing record "
                    f"{index}/{total_records}. "
                    f"Raw record={record}"
                )

        logger.info(
            "Finished processing all records."
        )

    def process_record(
        self,
        record: dict
    ) -> None:

        logger.debug(
            "Extracting S3 events from record..."
        )

        s3_events = self._extract_s3_events(
            record
        )

        logger.debug(
            f"Extracted {len(s3_events)} S3 event(s)."
        )

        for s3_event in s3_events:

            try:
                event_name = s3_event["eventName"]

                bucket = s3_event["s3"]["bucket"]["name"]

                key = s3_event["s3"]["object"]["key"]

            except KeyError as e:
                logger.exception(
                    f"Malformed S3 event. "
                    f"Missing key={e}"
                )
                continue

            logger.info(
                f"Received event={event_name} "
                f"for s3://{bucket}/{key}"
            )

            if event_name.startswith(
                "ObjectRemoved"
            ):
                self._handle_delete_event(
                    bucket=bucket,
                    key=key
                )
                continue

            if event_name.startswith(
                "ObjectCreated"
            ):
                self._handle_create_event(
                    bucket=bucket,
                    key=key
                )
                continue

            logger.warning(
                f"Unsupported event type: "
                f"{event_name}"
            )

    def _handle_create_event(
        self,
        bucket: str,
        key: str
    ) -> None:

        logger.info(
            f"Starting ingestion pipeline "
            f"for s3://{bucket}/{key}"
        )

        user_id = self._extract_user_from_key(key)

        if not user_id:
            logger.error(
                f"Failed extracting user_id "
                f"from key={key}"
            )
            return

        total_pages = 0
        total_chunks = 0

        all_tags: set[str] = set()

        vector_documents: list[
            VectorObject
        ] = []

        for content in self.s3_service.get_file_content(
            bucket=bucket,
            key=key
        ):

            total_pages += 1

            page = content.page
            text = content.text

            logger.debug(
                f"[{key}] Processing page={page} "
                f"text_length={len(text)}"
            )

            try:
                tag_result = (
                    self.tag_service.get_tags(
                        text
                    )
                )

                page_tags = [
                    tag.value
                    for tag in tag_result.tags
                ]

                all_tags.update(
                    page_tags
                )

                logger.debug(
                    f"[{key}] Extracted "
                    f"{len(page_tags)} tags "
                    f"(language={tag_result.language})"
                )

            except Exception:
                logger.exception(
                    f"[{key}] Failed extracting tags "
                    f"for page={page}"
                )

            for chunk in self.chunk_service.chunk(
                text
            ):

                total_chunks += 1

                logger.debug(
                    f"[{key}] Processing "
                    f"chunk_index={chunk.index}"
                )

                try:
                    embedding_result = (
                        self.embedding_service
                        .generate_embedding(
                            EmbeddingRequest(
                                chunk_text=chunk.text,
                                chunk_index=chunk.index,
                                object_key=key
                            )
                        )
                    )

                except Exception:
                    logger.exception(
                        f"[{key}] Failed generating "
                        f"embedding for "
                        f"page={page} "
                        f"chunk={chunk.index}"
                    )
                    continue

                metadata = VectorMetadata(
                    object_key=key,
                    bucket=bucket,
                    page=page,
                    chunk_index=chunk.index
                )

                vector_documents.append(
                    VectorObject(
                        chunk=chunk,
                        embedding=embedding_result.vector,
                        metadata=metadata
                    )
                )

        if not vector_documents:
            logger.warning(
                f"No vectors generated "
                f"for s3://{bucket}/{key}"
            )
            return

        logger.info(
            f"Saving batch with "
            f"{len(vector_documents)} vectors "
            f"for s3://{bucket}/{key}"
        )

        save_result = self.vector_service.save(
            vector_documents
        )

        logger.info(
            f"Successfully saved "
            f"{len(save_result.vector_ids)} vectors "
            f"for s3://{bucket}/{key}"
        )

        try:
            object_name = self._extract_object_name_from_key(key)
            self.dynamo_service.save_object(
                ObjectRecord(
                    object_name=object_name,
                    bucket=bucket,
                    user_id=user_id,
                    vector_ids=save_result.vector_ids,
                    tags=list(all_tags)
                )
            )

            logger.info(
                f"Successfully saved "
                f"DynamoDB metadata "
                f"ObjectName={object_name} "
                f"for s3://{bucket}/{key}"
            )

        except Exception:
            logger.exception(
                f"Failed saving DynamoDB metadata "
                f"for s3://{bucket}/{key}"
            )
            raise

        logger.info(
            f"Ingestion pipeline completed "
            f"for s3://{bucket}/{key}. "
            f"Pages={total_pages}, "
            f"Chunks={total_chunks}"
        )

    def _handle_delete_event(
        self,
        bucket: str,
        key: str
    ) -> None:

        logger.info(
            f"Starting vector cleanup "
            f"for deleted object "
            f"s3://{bucket}/{key}"
        )

        user_id = self._extract_user_from_key(key)

        object_name = self._extract_object_name_from_key(key)

        if not user_id:
            logger.error(
                f"Failed extracting user_id "
                f"from deleted object key={key}"
                f"from object name={object_name}"
            )
            return

        logger.debug(
            f"Fetching repository metadata "
            f"for s3://{bucket}/{key}"
        )

        try:
            object_result = (
                self.dynamo_service.get_object(
                    bucket=bucket,
                    object_name=object_name,
                    user_id=user_id
                )
            )

        except Exception:
            logger.exception(
                f"Failed fetching repository metadata "
                f"for s3://{bucket}/{key}"
            )
            raise

        if not object_result:
            logger.warning(
                f"No repository metadata found "
                f"for deleted object "
                f"s3://{bucket}/{key}"
            )
            return

        vector_ids = object_result.vector_ids

        if not vector_ids:
            logger.warning(
                f"No vector_ids found "
                f"for s3://{bucket}/{key}"
            )
        else:
            logger.info(
                f"Deleting "
                f"{len(vector_ids)} vectors "
                f"for s3://{bucket}/{key}"
            )

            try:
                self.vector_service.delete(
                    vector_ids=vector_ids
                )

                logger.info(
                    f"Successfully deleted "
                    f"{len(vector_ids)} vectors "
                    f"for s3://{bucket}/{key}"
                )

            except Exception:
                logger.exception(
                    f"Failed deleting vectors "
                    f"for s3://{bucket}/{key}"
                )
                raise

        logger.debug(
            f"Deleting repository metadata "
            f"for s3://{bucket}/{key}"
        )

        try:
            self.dynamo_service.delete_object(
                bucket=bucket,
                object_name=object_name,
                user_id=user_id
            )

            logger.info(
                f"Successfully deleted "
                f"repository metadata "
                f"for s3://{bucket}/{key}"
            )

        except Exception:
            logger.exception(
                f"Failed deleting repository metadata "
                f"for s3://{bucket}/{key}"
            )
            raise

        logger.info(
            f"Cleanup pipeline completed "
            f"for deleted object "
            f"s3://{bucket}/{key}"
        )

    def _extract_user_from_key(self, key: str) -> str | None:
        parts = key.split("/")

        if len(parts) < 3:
            logger.warning(
                f"Unexpected S3 key format: {key}"
            )
            return None

        user_id = parts[1]

        logger.debug(
            f"Extracted user_id='{user_id}' "
            f"from key='{key}'"
        )

        return user_id

    def _extract_object_name_from_key(self, key: str) -> str | None:
        parts = key.split("/")

        if len(parts) < 3:
            logger.warning(
                f"Unexpected S3 key format: {key}"
            )
            return None
        
        object_name = parts[-1]
        logger.debug(
            f"Extracted object_name='{object_name}' "
            f"from key='{key}'"
        )
        return object_name



    def _extract_s3_events(
        self,
        record: dict
    ) -> list[dict]:

        if "body" not in record:
            logger.debug(
                "Detected direct S3 event."
            )

            return [record]

        logger.debug(
            "Detected SQS-wrapped S3 event."
        )

        body = json.loads(
            record["body"]
        )

        return body.get(
            "Records",
            []
        )
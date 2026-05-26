import logging
import json
from config import Config
from handlers import ProcessorHandler, HandlerData
from services import (
    S3Service, S3ServiceData,
    TagService, TagServiceData,
    EmbeddingService, EmbeddingServiceData,
    VectorService, VectorServiceData,
    ChunkService, ChunkServiceData,
    DynamoService, DynamoServiceData
)

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

try:
    cfg = Config()

    s3_service_data = S3ServiceData(s3_client=cfg.s3_client)
    s3_service = S3Service(s3_service_data)

    tag_service_data = TagServiceData()
    tag_service = TagService(tag_service_data)

    embedding_service_data = EmbeddingServiceData(
        bedrock_runtime_client=cfg.bedrock_runtime_client,
        model_id=cfg.model_id
    )
    embedding_service = EmbeddingService(embedding_service_data)

    vector_service_data = VectorServiceData(
        vector_client=cfg.vector_client,
        vector_bucket_name=cfg.vector_bucket_name,
        vector_index_arn=cfg.index_arn
    )
    vector_service = VectorService(vector_service_data)

    chunk_service_data = ChunkServiceData()
    chunk_service = ChunkService(chunk_service_data)

    dynamo_service_data = DynamoServiceData(dynamodb_table_name=cfg.dynamo_table_name, dynamodb_client=cfg.dynamo_client)
    dynamo_service = DynamoService(dynamo_service_data)

    config_handler = HandlerData(s3_service, tag_service, embedding_service, vector_service, chunk_service, dynamo_service)
    processor = ProcessorHandler(config_handler)

except Exception as e:
    logger.exception("FATAL ERROR during cold start initialization!")
    raise e


def lambda_handler(event, context):
    records = event.get("Records", [])
    logger.info(f"Extracted {len(records)} records from the event.")
    
    if not records:
        logger.warning("No records found in the event! Exiting without processing.")
        return {"status": "no_records"}
    
    try:
        processor.process_all(records)
        logger.info(f"Successfully processed {len(records)} records.")
        return {"status": "success", "processed_records": len(records)}
        
    except Exception as e:
        logger.exception("Fatal error occurred while processing records.")
        raise e
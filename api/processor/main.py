import logging
import json
import os
from config import Config
from handlers import ProcessorHandler, HandlerData
from services import (
    S3Service, S3ServiceData,
    TagService, TagServiceData,
    TagRefinerService, TagRefinerData, BedrockTagRefinerClient,
    EmbeddingService, EmbeddingServiceData,
    VectorService, VectorServiceData,
    ChunkService, ChunkServiceData,
    DynamoService, DynamoServiceData
)

# Nível de log pelo ambiente (LOG_LEVEL=DEBUG para investigar). O padrão é INFO: no DEBUG
# o botocore imprime cada requisição e o YAKE cada palavra, e os logs úteis se perdem.
logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
for noisy in ("boto3", "botocore", "s3transfer", "urllib3"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

try:
    cfg = Config()

    s3_service_data = S3ServiceData(s3_client=cfg.s3_client, max_file_size_mb=cfg.max_file_size_mb)
    s3_service = S3Service(s3_service_data)

    tag_service_data = TagServiceData(max_keywords=cfg.yake_max_keywords)
    tag_service = TagService(tag_service_data)

    tag_refiner_client = BedrockTagRefinerClient(
        bedrock_runtime_client=cfg.bedrock_runtime_client,
        model_id=cfg.tag_refiner_model_id
    )
    tag_refiner_service = TagRefinerService(
        TagRefinerData(enabled=cfg.tag_refiner_enabled, max_tags=cfg.tag_refiner_max_tags),
        client=tag_refiner_client
    )

    embedding_service_data = EmbeddingServiceData(
        bedrock_runtime_client=cfg.bedrock_runtime_client,
        model_id=cfg.model_id,
        max_chunk_length=cfg.embedding_max_chunk_length
    )
    embedding_service = EmbeddingService(embedding_service_data)

    vector_service_data = VectorServiceData(
        vector_client=cfg.vector_client,
        vector_bucket_name=cfg.vector_bucket_name,
        vector_index_arn=cfg.index_arn
    )
    vector_service = VectorService(vector_service_data)

    chunk_service_data = ChunkServiceData(
        chunk_size=cfg.chunk_size,
        chunk_overlap=cfg.chunk_overlap,
        min_chunk_length=cfg.min_chunk_length,
    )
    chunk_service = ChunkService(chunk_service_data)

    dynamo_service_data = DynamoServiceData(dynamodb_table_name=cfg.dynamo_table_name, dynamodb_client=cfg.dynamo_client)
    dynamo_service = DynamoService(dynamo_service_data)

    config_handler = HandlerData(
        s3_service=s3_service,
        tag_service=tag_service,
        embedding_service=embedding_service,
        vector_service=vector_service,
        chunk_service=chunk_service,
        dynamo_service=dynamo_service,
        tag_refiner=tag_refiner_service,
        tag_max_length=cfg.tag_max_length,
    )
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
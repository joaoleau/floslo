import os
import boto3

class Config:
    def __init__(self):       
        self.region = boto3.Session().region_name
        self.s3_client = boto3.client(service_name="s3", region_name=self.region)
        self.bedrock_runtime_client = boto3.client(service_name="bedrock-runtime", region_name=self.region)
        self.model_id = os.getenv("EMBEDDING_MODEL_ID", "amazon.titan-embed-text-v2:0")
        self.bucket_name = os.getenv("BUCKET_NAME")
        self.vector_bucket_name = os.getenv("VECTOR_BUCKET_NAME")
        self.vector_client = boto3.client(service_name="s3vectors", region_name=self.region)
        self.index_arn = os.getenv("VECTOR_INDEX_ARN")
        self.dynamo_table_name = os.getenv("DYNAMO_TABLE")
        self.dynamo_client = boto3.client(service_name="dynamodb", region_name=self.region)
        self.max_file_size_mb = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "2000"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "300"))
        self.embedding_max_chunk_length = int(os.getenv("EMBEDDING_MAX_CHUNK_LENGTH", "8000"))
        self.tag_refiner_enabled = os.getenv("TAG_REFINER_ENABLED", "true").lower() in ("1", "true", "yes")
        self.tag_refiner_max_tags = int(os.getenv("TAG_REFINER_MAX_TAGS", "200"))
        self.tag_max_length = int(os.getenv("TAG_MAX_LENGTH", "32"))
        self.tag_refiner_model_id = os.getenv("TAG_REFINER_MODEL_ID", "amazon.nova-lite-v1:0")
        self.yake_max_keywords = int(os.getenv("YAKE_MAX_KEYWORDS", "300"))
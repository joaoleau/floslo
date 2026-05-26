import os
import boto3

class Config:
    def __init__(self):       
        self.region = boto3.Session().region_name
        self.s3_client = boto3.client(service_name="s3", region_name=self.region)
        self.bedrock_runtime_client = boto3.client(service_name="bedrock-runtime", region_name=self.region)
        self.model_id = os.getenv("MODEL_ID", "amazon.titan-embed-text-v2:0")
        self.bucket_name = os.getenv("BUCKET_NAME")
        self.vector_bucket_name = os.getenv("VECTOR_BUCKET_NAME")
        self.vector_client = boto3.client(service_name="s3vectors", region_name=self.region)
        self.index_arn = os.getenv("VECTOR_INDEX_ARN")
        self.dynamo_table_name = os.getenv("DYNAMO_TABLE")
        self.dynamo_client = boto3.client(service_name="dynamodb", region_name=self.region)
import json
import logging
from dataclasses import dataclass
from typing import Any
from .utils import normalize_text

logger = logging.getLogger(__name__)
# Set to DEBUG to capture granular execution steps
logger.setLevel(logging.DEBUG)

from dataclasses import dataclass

@dataclass(slots=True)
class EmbeddingRequest:
    chunk_text: str
    chunk_index: int
    object_key: str

@dataclass(slots=True)
class EmbeddingResponse:
    vector: list[float]
    dimensions: int
    model_id: str
    chunk_index: int
    object_key: str

@dataclass
class EmbeddingServiceData:
    bedrock_runtime_client: Any
    model_id: str
    max_chunk_length: int = 8000


class EmbeddingService:
    def __init__(self, config: EmbeddingServiceData):
        self.bedrock_runtime_client = config.bedrock_runtime_client
        self.model_id = config.model_id
        self.max_chunk_length = config.max_chunk_length

    def generate_embedding(
        self,
        request: EmbeddingRequest
    ) -> EmbeddingResponse:
        logger.debug(f"Starting embedding generation for chunk of length: {len(request.chunk_text)} characters.")
        
        chunk = normalize_text(request.chunk_text)

        if not chunk:
            raise ValueError(
                "Chunk is empty after normalization"
            )

        if len(chunk) > self.max_chunk_length:
            logger.warning(
                f"Chunk exceeded max length! "
                f"size={len(chunk)} > max={self.max_chunk_length}. "
                f"Truncating chunk to fit the model's limit."
            )
            chunk = chunk[:self.max_chunk_length]
            logger.debug(f"Chunk truncated. New length: {len(chunk)} characters.")

        logger.info(
            f"Generating embedding for chunk_size={len(chunk)} using model='{self.model_id}'"
        )

        logger.debug("Serializing chunk to JSON payload...")
        body = json.dumps({
            "inputText": chunk
        })

        try:
            logger.debug("Invoking Bedrock model via invoke_model API...")
            
            response = self.bedrock_runtime_client.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )

            # Log the HTTP status code from the Bedrock response metadata
            status_code = response.get("ResponseMetadata", {}).get("HTTPStatusCode")
            logger.debug(f"Bedrock API responded with HTTP status code: {status_code}")

            logger.debug("Reading and decoding the response StreamingBody...")
            response_body = json.loads(
                response["body"].read()
            )

            embedding = response_body.get(
                "embedding",
                []
            )

            if not embedding:
                raise ValueError(
                    "Embedding model returned empty vector"
                )

            logger.info(
                f"Embedding successfully generated with dimensions={len(embedding)}"
            )

            return EmbeddingResponse(
                vector=embedding,
                dimensions=len(embedding),
                model_id=self.model_id,
                chunk_index=request.chunk_index,
                object_key=request.object_key
            )

        except Exception as e:
            logger.exception(
                f"Failed generating embedding with model='{self.model_id}'. "
                f"Exception details: {str(e)}"
            )
            raise
import json
import logging
from dataclasses import dataclass
from typing import Any
from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


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


@dataclass(slots=True)
class EmbeddingServiceData:
    bedrock_runtime_client: Any
    model_id: str
    max_chunk_length: int = 3000


class EmbeddingService:
    def __init__(self, config: EmbeddingServiceData):
        self.bedrock_runtime_client = config.bedrock_runtime_client
        self.model_id = config.model_id
        self.max_chunk_length = config.max_chunk_length

    def generate_embedding(self, request: EmbeddingRequest) -> EmbeddingResponse:
        chunk = normalize_text(request.chunk_text)

        if not chunk:
            raise ValueError("Chunk is empty after normalization")

        if len(chunk) > self.max_chunk_length:
            logger.warning(
                f"Chunk exceeded max length ({len(chunk)} > {self.max_chunk_length}). "
                f"Truncating to fit model limits."
            )
            chunk = chunk[:self.max_chunk_length]

        try:
            response = self.bedrock_runtime_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps({"inputText": chunk}),
                contentType="application/json",
                accept="application/json"
            )

            response_body = json.loads(response["body"].read())
            embedding = response_body.get("embedding", [])

            if not embedding:
                raise ValueError("Embedding model returned empty vector")

            return EmbeddingResponse(
                vector=embedding,
                dimensions=len(embedding),
                model_id=self.model_id,
                chunk_index=request.chunk_index,
                object_key=request.object_key
            )

        except Exception as e:
            logger.exception(f"Failed generating embedding with model='{self.model_id}'. Error: {e}")
            raise
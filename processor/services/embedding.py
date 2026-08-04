import hashlib
import logging
import math
from dataclasses import dataclass

from langsmith import traceable

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
    model_id: str = "local-hashing-embedding-v1"
    dimensions: int = 256
    max_chunk_length: int = 3000


class EmbeddingService:
    """Local, dependency-free stand-in for the Bedrock Titan call in
    services/embedding.py.

    Uses feature hashing (token -> bucket, +/-1) so it is deterministic,
    instant, and needs no model download or network call -- enough to
    exercise the pipeline shape (batching, dimensions, metadata) while
    iterating on chunk/tag logic. It is NOT semantically meaningful.
    Swap this class for a real local embedding model (e.g. sentence-
    transformers via langchain) once you want to evaluate retrieval
    quality -- see README.md's "Improvement suggestions" section.
    """

    def __init__(self, config: EmbeddingServiceData):
        self.model_id = config.model_id
        self.dimensions = config.dimensions
        self.max_chunk_length = config.max_chunk_length

    @traceable(run_type="embedding", name="local_hash_embedding")
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

        vector = self._hash_embed(chunk)

        return EmbeddingResponse(
            vector=vector,
            dimensions=self.dimensions,
            model_id=self.model_id,
            chunk_index=request.chunk_index,
            object_key=request.object_key
        )

    def _hash_embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions

        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "big") % self.dimensions
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[bucket] += sign

        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]

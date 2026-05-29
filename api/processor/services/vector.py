import logging
from dataclasses import asdict, dataclass
from typing import Any

from .chunk import Chunk
from .utils import build_id_with_prefix

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@dataclass(slots=True)
class VectorMetadata:
    user: str
    object_key: str
    page: int
    chunk_index: int
    language: str
    chunk: str


@dataclass(slots=True)
class VectorObject:
    chunk: Chunk
    embedding: list[float]
    metadata: VectorMetadata


@dataclass(slots=True)
class VectorSaveResult:
    vector_ids: list[str]
    object_key: str


@dataclass(slots=True)
class VectorServiceData:
    vector_client: Any
    vector_bucket_name: str
    vector_index_arn: str


class VectorService:
    def __init__(self, config: VectorServiceData):
        self.client = config.vector_client
        self.vector_bucket_name = config.vector_bucket_name
        self.vector_index_arn = config.vector_index_arn

    def save(self, objects: list[VectorObject]) -> VectorSaveResult:
        if not objects:
            raise ValueError("Documents list cannot be empty.")

        payload = []
        vector_ids = []

        for obj in objects:
            if not obj.embedding:
                raise ValueError(
                    f"Document chunk_index={obj.metadata.chunk_index} has empty embedding."
                )

            vector_id = build_id_with_prefix("vec")
            vector_ids.append(vector_id)

            payload.append({
                "key": vector_id,
                "data": {"float32": obj.embedding},
                "metadata": asdict(obj.metadata)
            })

        try:
            self.client.put_vectors(
                indexArn=self.vector_index_arn,
                vectors=payload
            )
            
            logger.info(f"Successfully saved {len(vector_ids)} vectors to index='{self.vector_index_arn}'")
            
            return VectorSaveResult(
                vector_ids=vector_ids,
                object_key=objects[0].metadata.object_key
            )
        except Exception:
            logger.exception("Failed batch vector save.")
            raise

    def query_vectors(self, filters: dict[str, Any], embedding: list[float] | None = None, top_k: int = 10) -> list[str]:
        try:
            request_params = {
                "indexArn": self.vector_index_arn,
                "filter": filters,
                "maxResults": top_k
            }

            if embedding:
                request_params["queries"] = [{"vector": embedding}]

            response = self.client.query_vectors(**request_params)

            results = response.get("results", [])
            vector_ids = [item.get("key") for item in results if item.get("key")]
            logger.info(f"Query returned {len(vector_ids)} matching vector(s).")
            return vector_ids

        except Exception:
            logger.exception("Failed querying vectors.")
            raise

    def delete(self, vector_ids: list[str]) -> None:
        if not vector_ids:
            logger.warning("Delete called with empty vector_ids list.")
            return

        try:
            self.client.delete_vectors(
                indexArn=self.vector_index_arn,
                keys=vector_ids
            )
            logger.info(f"Successfully deleted {len(vector_ids)} vectors.")
        except Exception:
            logger.exception("Failed deleting vectors.")
            raise


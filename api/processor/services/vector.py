import logging
from dataclasses import asdict, dataclass
from typing import Any

from .chunk import Chunk
from .utils import build_vector_id

logger = logging.getLogger(__name__)

# Limite do S3 Vectors por requisição de PutVectors e de DeleteVectors.
VECTORS_BATCH_SIZE = 500


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

    def save(self, objects: list[VectorObject], object_id: str) -> VectorSaveResult:
        if not objects:
            raise ValueError("Documents list cannot be empty.")

        payload = []
        vector_ids = []
        seen_ids: set[str] = set()

        for obj in objects:
            if not obj.embedding:
                raise ValueError(
                    f"Document chunk_index={obj.metadata.chunk_index} has empty embedding."
                )

            vector_id = build_vector_id(object_id, obj.metadata.page, obj.metadata.chunk_index)
            if vector_id in seen_ids:
                raise ValueError(f"Duplicate vector id {vector_id}.")
            seen_ids.add(vector_id)
            vector_ids.append(vector_id)

            payload.append({
                "key": vector_id,
                "data": {"float32": obj.embedding},
                "metadata": asdict(obj.metadata)
            })

        stored_ids: list[str] = []

        try:
            for start in range(0, len(payload), VECTORS_BATCH_SIZE):
                batch = payload[start:start + VECTORS_BATCH_SIZE]
                self.client.put_vectors(
                    indexArn=self.vector_index_arn,
                    vectors=batch
                )
                stored_ids.extend(vector["key"] for vector in batch)

            logger.info(f"Successfully saved {len(vector_ids)} vectors to index='{self.vector_index_arn}'")

            return VectorSaveResult(
                vector_ids=vector_ids,
                object_key=objects[0].metadata.object_key
            )
        except Exception:
            logger.exception("Failed batch vector save.")
            # Com mais de um lote, uma falha no meio deixaria vetores órfãos que o handler
            # não conhece (ele só recebe os ids quando save() termina) -- limpa aqui.
            self._delete_stored_after_failure(stored_ids)
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
            for start in range(0, len(vector_ids), VECTORS_BATCH_SIZE):
                self.client.delete_vectors(
                    indexArn=self.vector_index_arn,
                    keys=vector_ids[start:start + VECTORS_BATCH_SIZE]
                )
            logger.info(f"Successfully deleted {len(vector_ids)} vectors.")
        except Exception:
            logger.exception("Failed deleting vectors.")
            raise

    def _delete_stored_after_failure(self, stored_ids: list[str]) -> None:
        if not stored_ids:
            return

        try:
            self.delete(stored_ids)
        except Exception:
            logger.exception(f"Failed cleaning up {len(stored_ids)} vectors stored before a failed save.")


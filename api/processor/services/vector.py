import logging
from dataclasses import asdict, dataclass
from typing import Any
import uuid

from .chunk import Chunk

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@dataclass(slots=True)
class VectorMetadata:
    object_key: str
    bucket: str
    page: int
    chunk_index: int


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

    def _build_vector_id(self) -> str:
        return str(uuid.uuid4())

    def save(self, documents: list[VectorObject]) -> VectorSaveResult:

        logger.debug(f"Starting batch vector save "f"for {len(documents)} documents.")

        if not documents:
            raise ValueError(
                "Documents list cannot be empty."
            )

        payload = []
        vector_ids = []

        for document in documents:

            if not document.embedding:
                raise ValueError(
                    f"Document chunk_index="
                    f"{document.metadata.chunk_index} "
                    f"has empty embedding."
                )

            vector_id = self._build_vector_id()
            vector_ids.append(vector_id)

            logger.debug(
                f"Preparing vector payload "
                f"for vector_id={vector_id}"
            )

            payload.append(
                {
                    "key": vector_id,
                    "data": {
                        "float32": document.embedding
                    },
                    "metadata": asdict(
                        document.metadata
                    )
                }
            )

        logger.info(
            f"Saving {len(payload)} vectors "
            f"to index='{self.vector_index_arn}'"
        )

        try:
            logger.debug(
                f"Calling put_vectors "
                f"with batch size={len(payload)}"
            )

            response = self.client.put_vectors(
                indexArn=self.vector_index_arn,
                vectors=payload
            )

            logger.debug(
                f"put_vectors response: {response}"
            )

            logger.info(
                f"Successfully saved "
                f"{len(vector_ids)} vectors."
            )

            return VectorSaveResult(
                vector_ids=vector_ids,
                object_key=documents[0].metadata.object_key
            )

        except Exception as e:
            logger.exception(
                f"Failed batch vector save. "
                f"Error={e}"
            )
            raise

    def delete(self, vector_ids: list[str]) -> None:

        logger.debug(
            f"Starting vector deletion "
            f"for {len(vector_ids)} vectors."
        )

        if not vector_ids:
            logger.warning(
                "Delete called with empty vector_ids list."
            )
            return

        try:
            logger.debug(
                f"Calling delete_vectors "
                f"for {len(vector_ids)} keys."
            )

            response = self.client.delete_vectors(
                indexArn=self.vector_index_arn,
                keys=vector_ids
            )

            logger.debug(
                f"delete_vectors response: {response}"
            )

            logger.info(
                f"Successfully deleted "
                f"{len(vector_ids)} vectors."
            )

        except Exception as e:
            logger.exception(
                f"Failed deleting vectors. "
                f"Error={e}"
            )
            raise
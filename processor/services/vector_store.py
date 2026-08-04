import json
import logging
import math
from dataclasses import asdict, dataclass
from pathlib import Path
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
    headers: dict[str, str] | None = None


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
class VectorStoreData:
    output_path: Path


class VectorStore:
    """Local JSON-file stand-in for services/vector.py's S3 Vectors client.

    Loads/rewrites the whole file per call -- fine for local experimentation
    with a handful of documents, not meant for production scale. `query_vectors`
    does an in-memory cosine-similarity scan so retrieval can still be tested
    end-to-end without any external vector DB.
    """

    def __init__(self, config: VectorStoreData):
        self.output_path = config.output_path
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.output_path.exists():
            self.output_path.write_text("[]", encoding="utf-8")

    def save(self, objects: list[VectorObject]) -> VectorSaveResult:
        if not objects:
            raise ValueError("Documents list cannot be empty.")

        records = self._load()
        vector_ids = []

        for obj in objects:
            if not obj.embedding:
                raise ValueError(
                    f"Document chunk_index={obj.metadata.chunk_index} has empty embedding."
                )

            vector_id = build_id_with_prefix("vec")
            vector_ids.append(vector_id)

            records.append({
                "key": vector_id,
                "data": {"float32": obj.embedding},
                "metadata": asdict(obj.metadata)
            })

        self._write(records)
        logger.info(f"Successfully saved {len(vector_ids)} vectors to '{self.output_path}'")

        return VectorSaveResult(vector_ids=vector_ids, object_key=objects[0].metadata.object_key)

    def query_vectors(self, filters: dict[str, Any], embedding: list[float] | None = None, top_k: int = 10) -> list[str]:
        records = self._load()

        def matches(record: dict) -> bool:
            metadata = record["metadata"]
            return all(metadata.get(k) == v for k, v in filters.items())

        candidates = [r for r in records if matches(r)]

        if embedding:
            candidates.sort(key=lambda r: self._cosine_similarity(embedding, r["data"]["float32"]), reverse=True)

        vector_ids = [r["key"] for r in candidates[:top_k]]
        logger.info(f"Query returned {len(vector_ids)} matching vector(s).")
        return vector_ids

    def delete(self, vector_ids: list[str]) -> None:
        if not vector_ids:
            logger.warning("Delete called with empty vector_ids list.")
            return

        records = self._load()
        remaining = [r for r in records if r["key"] not in set(vector_ids)]
        self._write(remaining)
        logger.info(f"Successfully deleted {len(records) - len(remaining)} vectors.")

    def _load(self) -> list[dict]:
        return json.loads(self.output_path.read_text(encoding="utf-8"))

    def _write(self, records: list[dict]) -> None:
        self.output_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
        norm_b = math.sqrt(sum(y * y for y in b)) or 1.0
        return dot / (norm_a * norm_b)

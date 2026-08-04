import json
import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@dataclass(slots=True)
class Object:
    id: str
    name: str
    key: str
    user_id: str
    tags: list[str]
    status: str
    created_at: str


@dataclass(slots=True)
class MetadataStoreData:
    output_path: Path


class MetadataStore:
    """Local JSON-file stand-in for services/dynamo.py's DynamoService."""

    def __init__(self, config: MetadataStoreData):
        self.output_path = config.output_path
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.output_path.exists():
            self.output_path.write_text("[]", encoding="utf-8")

    def save_object(self, record: Object) -> None:
        if record is None:
            logger.warning("Attempted to save a None record. Operation skipped.")
            return

        if record.user_id is None or record.id is None:
            logger.warning("Record must have both user_id and id. Operation skipped.")
            return

        records = self._load()
        item = asdict(record)
        item["PK"] = self._pk(record.user_id)
        item["SK"] = self._sk(record.id)
        item["created_at"] = record.created_at or datetime.now(UTC).isoformat()

        records.append(item)
        self._write(records)
        logger.info(f"Successfully saved object metadata for object_id={record.id}")

    def get_object(self, object_id: str, user_id: str) -> Object | None:
        for item in self._load():
            if item["PK"] == self._pk(user_id) and item["SK"] == self._sk(object_id):
                return Object(
                    id=item["id"],
                    name=item["name"],
                    key=item["key"],
                    user_id=item["user_id"],
                    tags=item["tags"],
                    status=item["status"],
                    created_at=item["created_at"]
                )

        logger.warning(f"Object with id={object_id} not found for user_id={user_id}")
        return None

    def delete_object(self, object_id: str, user_id: str) -> None:
        records = self._load()
        remaining = [
            item for item in records
            if not (item["PK"] == self._pk(user_id) and item["SK"] == self._sk(object_id))
        ]
        self._write(remaining)
        logger.info(f"Successfully deleted object metadata for object_id={object_id}")

    def _pk(self, user_id: str) -> str:
        return f"USER#{user_id}"

    def _sk(self, object_id: str) -> str:
        return f"OBJECT#{object_id}"

    def _load(self) -> list[dict]:
        return json.loads(self.output_path.read_text(encoding="utf-8"))

    def _write(self, records: list[dict]) -> None:
        self.output_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

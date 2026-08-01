import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

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
    vector_ids: list[str]
    ttl: int | None = None


@dataclass(slots=True)
class DynamoServiceData:
    dynamodb_table_name: str
    dynamodb_client: Any


class DynamoService:
    def __init__(self, config: DynamoServiceData):
        self.client = config.dynamodb_client
        self.table_name = config.dynamodb_table_name

    def _build_pk(self, user_id: str) -> str:
        return f"USER#{user_id}"

    def _build_sk(self, object_id: str) -> str:
        return f"OBJECT#{object_id}"

    def save_object(self, record: Object) -> None:
        if record is None:
            logger.warning("Attempted to save a None record. Operation skipped.")
            return

        if record.user_id is None or record.id is None:
            logger.warning("Record must have both user_id and id. Operation skipped.")
            return
        
        item = {
            "PK": self._build_pk(record.user_id),
            "SK": self._build_sk(record.id),
            "id": record.id,
            "name": record.name,
            "key": record.key,
            "user_id": record.user_id,
            "tags": record.tags,
            "status": record.status,
            "created_at": record.created_at if record.created_at else datetime.now(UTC).isoformat(),
            "vector_ids": record.vector_ids
        }
        # ttl is only ever set on the "failed" transition. put_item replaces the whole
        # item, so leaving this key out on "processing"/"active" writes is enough to
        # ensure those states never carry a stale ttl from a previous write.
        if record.ttl is not None:
            item["ttl"] = record.ttl

        try:
            self.client.put_item(
                TableName=self.table_name,
                Item={key: self._serialize_value(value) for key, value in item.items()}
            )
            logger.info(f"Successfully saved object metadata for object_id={record.id} status={record.status}")
        except Exception:
            logger.exception(f"Failed saving object metadata for object_id={record.id}")
            raise

    def get_object(self, object_id: str, user_id: str) -> Object | None:
        try:
            response = self.client.get_item(
                TableName=self.table_name, 
                Key={
                    "PK": {"S": self._build_pk(user_id)},
                    "SK": {"S": self._build_sk(object_id)}
                }
            )

            item = response.get("Item")
            if not item:
                logger.warning(f"Object with id={object_id} not found for user_id={user_id}")
                return None

            return Object(
                id=self._deserialize_value(item["id"]),
                name=self._deserialize_value(item["name"]),
                key=self._deserialize_value(item["key"]),
                user_id=self._deserialize_value(item["user_id"]),
                tags=self._deserialize_value(item["tags"]),
                status=self._deserialize_value(item["status"]),
                created_at=self._deserialize_value(item["created_at"]),
                vector_ids=self._deserialize_value(item["vector_ids"]) if "vector_ids" in item else [],
                ttl=self._deserialize_value(item["ttl"]) if "ttl" in item else None
            )
        except Exception:
            logger.exception(f"Failed retrieving object metadata for object_id={object_id}")
            raise

    def delete_object(self, object_id: str, user_id: str) -> None:
        try:
            self.client.delete_item(
                TableName=self.table_name, 
                Key={
                    "PK": {"S": self._build_pk(user_id)},
                    "SK": {"S": self._build_sk(object_id)}
                }
            )
            logger.info(f"Successfully deleted object metadata for object_id={object_id}") # Corrigido: usando object_id
        except Exception:
            logger.exception(f"Failed deleting object metadata for object_id={object_id}")
            raise

    def _serialize_value(self, value: Any) -> dict:
        if isinstance(value, str):
            return {"S": value}
        if isinstance(value, int):
            return {"N": str(value)}
        if isinstance(value, list):
            return {"L": [self._serialize_value(item) for item in value]}
        raise TypeError(f"Unsupported DynamoDB type: {type(value)}")

    def _deserialize_value(self, value: dict) -> Any:
        if "S" in value:
            return value["S"]
        if "N" in value:
            return int(value["N"])
        if "L" in value:
            return [self._deserialize_value(item) for item in value["L"]]
        raise TypeError(f"Unsupported DynamoDB value: {value}")
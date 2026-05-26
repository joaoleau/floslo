import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@dataclass(slots=True)
class ObjectRecord:
    object_name: str
    bucket: str
    user_id: str
    vector_ids: list[str]
    tags: list[str]


@dataclass(slots=True)
class ObjectResult:
    object_name: str
    vector_ids: list[str]
    tags: list[str]
    created_at: str


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

    def _build_sk(self, object_name: str) -> str:
        return (f"OBJECT#{object_name}")

    def save_object(self, record: ObjectRecord) -> None:

        logger.debug(
            f"Saving object metadata "
            f"for object_name="
            f"{record.object_name}"
        )

        item = {
            "PK": self._build_pk(
                record.user_id
            ),
            "SK": self._build_sk(
                object_name=record.object_name
            ),
            "object_name": record.object_name,
            "vector_ids": record.vector_ids,
            "tags": record.tags,
            "created_at": datetime.now(
                UTC
            ).isoformat()
        }

        try:
            self.client.put_item(
                TableName=self.table_name,
                Item={
                    key: self._serialize_value(value)
                    for key, value in item.items()
                }
            )

            logger.info(
                f"Successfully saved "
                f"object metadata "
                f"for object_name="
                f"{record.object_name}"
            )

        except Exception as e:
            logger.exception(
                f"Failed saving object metadata. "
                f"Error={e}"
            )
            raise

    def get_object(self, object_name: str, user_id: str) -> ObjectResult | None:
        logger.debug(
            f"Fetching object metadata "
            f"for object_name="
            f"{object_name}"
        )

        try:
            response = self.client.get_item(
                TableName=self.table_name,
                Key={
                    "PK": {
                        "S": self._build_pk(
                            user_id
                        )
                    },

                    "SK": {
                        "S": self._build_sk(
                            object_name=object_name
                        )
                    }
                }
            )

            item = response.get(
                "Item"
            )

            if not item:
                logger.warning(
                    f"Object metadata "
                    f"not found for "
                    f"object_name={object_name}"
                )

                return None

            parsed_item = {
                key: self._deserialize_value(
                    value
                )
                for key, value in item.items()
            }

            logger.info(
                f"Successfully fetched "
                f"object metadata "
                f"for object_name="
                f"{object_name}"
            )

            return ObjectResult(
                object_name=parsed_item[
                    "object_name"
                ],
                vector_ids=parsed_item[
                    "vector_ids"
                ],
                tags=parsed_item[
                    "tags"
                ],
                created_at=parsed_item[
                    "created_at"
                ]
            )

        except Exception as e:
            logger.exception(
                f"Failed fetching "
                f"object metadata. "
                f"Error={e}"
            )
            raise

    def delete_object(self, object_name: str, user_id: str) -> None:
        logger.debug(
            f"Deleting object metadata "
            f"for object_name="
            f"{object_name}"
        )

        try:
            self.client.delete_item(
                TableName=self.table_name,
                Key={
                    "PK": {
                        "S": self._build_pk(
                            user_id
                        )
                    },

                    "SK": {
                        "S": self._build_sk(
                            object_name=object_name
                        )
                    }
                }
            )

            logger.info(
                f"Successfully deleted "
                f"object metadata "
                f"for object_name="
                f"{object_name}"
            )

        except Exception as e:
            logger.exception(
                f"Failed deleting "
                f"object metadata. "
                f"Error={e}"
            )
            raise

    def _serialize_value(
        self,
        value: Any
    ) -> dict:

        if isinstance(value, str):
            return {"S": value}

        if isinstance(value, int):
            return {"N": str(value)}

        if isinstance(value, list):
            return {
                "L": [
                    self._serialize_value(
                        item
                    )
                    for item in value
                ]
            }

        raise TypeError(
            f"Unsupported DynamoDB type: "
            f"{type(value)}"
        )

    def _deserialize_value(
        self,
        value: dict
    ) -> Any:

        if "S" in value:
            return value["S"]

        if "N" in value:
            return int(value["N"])

        if "L" in value:
            return [
                self._deserialize_value(
                    item
                )
                for item in value["L"]
            ]

        raise TypeError(
            f"Unsupported DynamoDB value: "
            f"{value}"
        )
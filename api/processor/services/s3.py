import io
import logging
import os
from dataclasses import dataclass
from typing import Any, Iterator

from pypdf import PdfReader

from .utils import normalize_text

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {"pdf"}


class PdfOcrRequiredError(Exception):
    pass


@dataclass(slots=True)
class ObjectContent:
    bucket: str
    key: str
    page: int
    text: str
    file_type: str


@dataclass(slots=True)
class S3ServiceData:
    s3_client: Any
    max_file_size_mb: int = 50


class S3Service:

    def __init__(self, config: S3ServiceData):
        self.s3_client = config.s3_client
        self.max_file_size_mb = config.max_file_size_mb

    def get_file_content(self, bucket: str, key: str) -> Iterator[ObjectContent]:
        _, ext = os.path.splitext(key)
        ext = ext.lower().lstrip(".")

        if ext not in SUPPORTED_EXTENSIONS:
            logger.error(f"Unsupported file type '{ext}' for key: '{key}'")
            raise ValueError(f"Unsupported file type: {ext}")

        self._validate_file_size(bucket, key)

        buffer = self._download_to_buffer(bucket, key)

        yield from self._read_pdf_file(bucket, key, buffer)

    def _download_to_buffer(self, bucket: str, key: str) -> io.BytesIO:
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)
        try:
            body = obj["Body"].read()
        finally:
            obj["Body"].close()

        logger.info(f"Downloaded s3://{bucket}/{key} into memory for extraction ({len(body)} bytes)")
        return io.BytesIO(body)

    def _read_pdf_file(self, bucket: str, key: str, buffer: io.BytesIO) -> Iterator[ObjectContent]:
        reader = PdfReader(buffer)
        logger.info(f"Processing PDF via pypdf: '{key}' with {len(reader.pages)} page(s)")

        yielded_any = False

        for page_number, page in enumerate(reader.pages, start=1):
            try:
                text = normalize_text(page.extract_text() or "")

                if not text:
                    continue

                yielded_any = True
                yield ObjectContent(bucket=bucket, key=key, page=page_number, text=text, file_type="pdf")
            except Exception:
                logger.exception(f"Failed extracting text from page={page_number} key={key}")

        if not yielded_any and len(reader.pages) > 0:
            logger.warning(f"No extractable text on any page -- likely a scanned/image-only PDF. key={key}")
            raise PdfOcrRequiredError(key)

    def delete_file(self, bucket: str, key: str) -> None:
        self.s3_client.delete_object(Bucket=bucket, Key=key)
        logger.info(f"Successfully deleted object s3://{bucket}/{key}")

    def _validate_file_size(self, bucket: str, key: str) -> None:
        metadata = self.s3_client.head_object(Bucket=bucket, Key=key)
        size_mb = metadata["ContentLength"] / 1024 / 1024

        if size_mb > self.max_file_size_mb:
            logger.error(f"File '{key}' ({size_mb:.2f}MB) exceeds limit of {self.max_file_size_mb}MB")
            raise ValueError(
                f"File exceeds maximum allowed size ({size_mb:.2f}MB > {self.max_file_size_mb}MB)"
            )

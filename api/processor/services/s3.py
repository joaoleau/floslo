import io
import logging
import os
from dataclasses import dataclass
from typing import Any, Iterator

from pypdf import PdfReader
from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


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

        self._validate_file_size(bucket, key)

        if ext in ["txt", "md"]:
            yield from self._read_text_file(bucket, key, ext)
        elif ext == "pdf":
            yield from self._read_pdf_file(bucket, key)
        else:
            logger.error(f"Unsupported file type '{ext}' for key: '{key}'")
            raise ValueError(f"Unsupported file type: {ext}")

    def _read_text_file(self, bucket: str, key: str, ext: str) -> Iterator[ObjectContent]:
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)
        
        try:
            content = normalize_text(obj["Body"].read().decode("utf-8"))

            if not content:
                logger.warning(f"Text file is empty after normalization. key={key}")
                return

            logger.info(f"Successfully processed text file: '{key}'")
            yield ObjectContent(
                bucket=bucket, 
                key=key, 
                page=1, 
                text=content, 
                file_type=ext
            )
        finally:
            obj["Body"].close()

    def _read_pdf_file(self, bucket: str, key: str) -> Iterator[ObjectContent]:
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)
        
        try:
            pdf_stream = io.BytesIO(obj["Body"].read())
            reader = PdfReader(pdf_stream)
            total_pages = len(reader.pages)
            
            logger.info(f"Processing PDF: '{key}' with {total_pages} pages")

            for page_number, page in enumerate(reader.pages, start=1):
                try:
                    raw_text = page.extract_text() or ""
                    text = normalize_text(raw_text)
                    
                    if not text:
                        continue

                    yield ObjectContent(
                        bucket=bucket, 
                        key=key, 
                        page=page_number, 
                        text=text, 
                        file_type="pdf"
                    )
                except Exception:
                    logger.exception(f"Failed extracting text from page={page_number} key={key}")
        finally:
            obj["Body"].close()

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
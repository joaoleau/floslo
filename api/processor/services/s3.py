import io
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterator
from .utils import normalize_text

from pypdf import PdfReader

logger = logging.getLogger(__name__)
# Definido para DEBUG para extrair o máximo de detalhes
logger.setLevel(logging.DEBUG)


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
        logger.debug(f"Starting content extraction for s3://{bucket}/{key}")
        
        _, ext = os.path.splitext(key)
        ext = ext.lower().lstrip(".")
        logger.debug(f"Extracted file extension: '{ext}'")

        # Validar tamanho antes de baixar
        self._validate_file_size(bucket, key)

        if ext in ["txt", "md"]:
            logger.info(f"Routing to text file handler for '{key}'")
            yield from self._read_text_file(bucket, key, ext)

        elif ext == "pdf":
            logger.info(f"Routing to PDF file handler for '{key}'")
            yield from self._read_pdf_file(bucket, key)

        else:
            logger.error(f"Unsupported file type requested: '{ext}' for key: '{key}'")
            raise ValueError(f"Unsupported file type: {ext}")

    def _read_text_file(self, bucket: str, key: str, ext: str) -> Iterator[Dict[str, Any]]:
        logger.debug(f"Calling S3 get_object for s3://{bucket}/{key}")
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)

        try:
            logger.debug("Decoding text object stream (utf-8)...")
            content = obj["Body"].read().decode("utf-8")
            raw_length = len(content)
            
            content = normalize_text(content)
            logger.debug(f"Text normalized. Length changed from {raw_length} to {len(content)} chars.")

            if not content:
                logger.warning(f"Text file is empty after normalization. bucket={bucket} key={key}")
                return

            logger.info(f"Successfully processed text file: '{key}' ({len(content)} characters)")
            yield ObjectContent(
                bucket=bucket,
                key=key,
                page=1,
                text=content,
                file_type=ext
            )

        finally:
            logger.debug(f"Closing S3 object stream for '{key}'")
            obj["Body"].close()

    def _read_pdf_file(self, bucket: str, key: str) -> Iterator[Dict[str, Any]]:
        logger.debug(f"Calling S3 get_object for PDF s3://{bucket}/{key}")
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)

        try:
            logger.debug("Loading PDF bytes into memory (BytesIO)...")
            pdf_stream = io.BytesIO(obj["Body"].read())
            stream_size = pdf_stream.getbuffer().nbytes
            logger.debug(f"PDF stream loaded into memory. Size: {stream_size / 1024:.2f} KB")

            reader = PdfReader(pdf_stream)
            total_pages = len(reader.pages)
            logger.info(f"PDF parsed successfully. bucket={bucket} key={key} total_pages={total_pages}")

            for page_number, page in enumerate(reader.pages, start=1):
                logger.debug(f"Extracting text from page {page_number}/{total_pages} of '{key}'...")
                
                try:
                    text = page.extract_text()
                    text = normalize_text(text)
                    
                    if not text:
                        logger.warning(f"Skipping empty or unextractable page. page={page_number} key={key}")
                        continue

                    logger.debug(f"Successfully extracted {len(text)} characters from page={page_number} key={key}")
                    
                    yield ObjectContent(
                        bucket=bucket,
                        key=key,
                        page=page_number,
                        text=text,
                        file_type="pdf"
                    )

                except Exception as e:
                    logger.exception(f"Failed extracting text from page={page_number} key={key}. Error: {e}")

        finally:
            logger.debug(f"Closing S3 object stream and memory buffers for '{key}'")
            obj["Body"].close()

    def _validate_file_size(self, bucket: str, key: str) -> None:
        logger.debug(f"Calling S3 head_object to validate file size for s3://{bucket}/{key}")
        metadata = self.s3_client.head_object(Bucket=bucket, Key=key)

        size_bytes = metadata["ContentLength"]
        size_mb = size_bytes / 1024 / 1024
        
        logger.debug(f"File size retrieved: {size_bytes} bytes ({size_mb:.2f} MB)")

        if size_mb > self.max_file_size_mb:
            logger.error(f"File size validation failed! {size_mb:.2f}MB exceeds limit of {self.max_file_size_mb}MB for '{key}'")
            raise ValueError(
                f"File exceeds maximum allowed size "
                f"({size_mb:.2f}MB > {self.max_file_size_mb}MB)"
            )
        
        logger.debug(f"File size validation passed for '{key}'")
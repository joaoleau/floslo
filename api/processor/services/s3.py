import csv
import io
import json
import logging
import os
from dataclasses import dataclass
from typing import Any, Iterator

import docx2txt
from pptx import Presentation
from pypdf import PdfReader

from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

SUPPORTED_EXTENSIONS = {"txt", "md", "pdf", "docx", "csv", "json", "pptx"}


class PdfOcrRequiredError(Exception):
    """Raised when a PDF has at least one page but pypdf couldn't extract text
    from any of them -- almost always a scanned/image-only PDF, which we don't
    run OCR on. Caught upstream so the resulting "failed" record carries a
    specific, human-readable error_message instead of a generic one.
    """


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
    max_file_size_mb: int = 500


class S3Service:
    """Reads each object into an in-memory buffer and extracts text directly
    with pypdf/docx2txt/python-pptx/csv/json -- no filesystem tempfile, no
    LangChain document loaders.

    This used to go through LangChain's community document loaders (which
    need a local file path, hence a download to Lambda's /tmp first). That
    was reverted after langchain-community's transitive dependencies (numpy
    duplicated on top of yake's own copy, sqlalchemy, aiohttp, zstandard via
    langsmith, etc. -- ~80MB across the whole langchain dependency chain,
    including langchain-text-splitters) pushed the Lambda's deployment
    package past the 250MB unzipped code+layers limit and broke the stack
    update. pypdf/docx2txt/python-pptx were already the libraries doing the
    actual work underneath those loaders -- calling them directly, on an
    in-memory buffer (all three accept a file-like object, not just a path),
    keeps the same file format support without the wrapper's dependency
    weight or the tempfile download/cleanup step.
    """

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

        if ext in ("txt", "md"):
            yield from self._read_text_file(bucket, key, buffer, ext)
        elif ext == "pdf":
            yield from self._read_pdf_file(bucket, key, buffer)
        elif ext == "docx":
            yield from self._read_docx_file(bucket, key, buffer)
        elif ext == "csv":
            yield from self._read_csv_file(bucket, key, buffer)
        elif ext == "json":
            yield from self._read_json_file(bucket, key, buffer)
        elif ext == "pptx":
            yield from self._read_pptx_file(bucket, key, buffer)

    def _download_to_buffer(self, bucket: str, key: str) -> io.BytesIO:
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)
        try:
            body = obj["Body"].read()
        finally:
            obj["Body"].close()

        logger.info(f"Downloaded s3://{bucket}/{key} into memory for extraction ({len(body)} bytes)")
        return io.BytesIO(body)

    def _read_text_file(self, bucket: str, key: str, buffer: io.BytesIO, ext: str) -> Iterator[ObjectContent]:
        text = normalize_text(buffer.read().decode("utf-8"))

        if not text:
            logger.warning(f"Text file is empty after normalization. key={key}")
            return

        logger.info(f"Successfully processed text file: '{key}'")
        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type=ext)

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

    def _read_docx_file(self, bucket: str, key: str, buffer: io.BytesIO) -> Iterator[ObjectContent]:
        text = normalize_text(docx2txt.process(buffer))

        if not text:
            logger.warning(f"DOCX file is empty after normalization. key={key}")
            return

        logger.info(f"Successfully processed DOCX file via docx2txt: '{key}'")
        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="docx")

    def _read_csv_file(self, bucket: str, key: str, buffer: io.BytesIO) -> Iterator[ObjectContent]:
        # One "row: field: value" block per CSV row, joined into a single page --
        # matches the previous per-file (not per-row) granularity used by every other reader.
        text_stream = io.TextIOWrapper(buffer, encoding="utf-8")
        reader = csv.DictReader(text_stream)

        rows = []
        for row in reader:
            rows.append("\n".join(f"{field}: {value}" for field, value in row.items()))

        text = normalize_text("\n\n".join(rows))

        if not text:
            logger.warning(f"CSV file is empty after normalization. key={key}")
            return

        logger.info(f"Successfully processed CSV file: '{key}'")
        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="csv")

    def _read_json_file(self, bucket: str, key: str, buffer: io.BytesIO) -> Iterator[ObjectContent]:
        data = json.loads(buffer.read().decode("utf-8"))
        text = normalize_text(json.dumps(data, ensure_ascii=False, indent=2))

        if not text:
            logger.warning(f"JSON file is empty after normalization. key={key}")
            return

        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="json")

    def _read_pptx_file(self, bucket: str, key: str, buffer: io.BytesIO) -> Iterator[ObjectContent]:
        presentation = Presentation(buffer)
        logger.info(f"Processing PPTX via python-pptx: '{key}' with {len(presentation.slides)} slide(s)")

        for slide_number, slide in enumerate(presentation.slides, start=1):
            try:
                fragments = []
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        fragments.append(shape.text_frame.text)
                    elif shape.has_table:
                        for row in shape.table.rows:
                            fragments.append("\t".join(cell.text for cell in row.cells))

                text = normalize_text("\n".join(fragment for fragment in fragments if fragment))
                if not text:
                    continue

                yield ObjectContent(bucket=bucket, key=key, page=slide_number, text=text, file_type="pptx")
            except Exception:
                logger.exception(f"Failed extracting text from slide={slide_number} key={key}")

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

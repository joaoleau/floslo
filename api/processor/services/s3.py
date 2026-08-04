import json
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

from langchain_community.document_loaders import (
    CSVLoader,
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
)
from pptx import Presentation

from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

SUPPORTED_EXTENSIONS = {"txt", "md", "pdf", "docx", "csv", "json", "pptx"}


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
    """Extraction is delegated to langchain_community.document_loaders
    (TextLoader for txt/md, PyPDFLoader for pdf, Docx2txtLoader for docx,
    CSVLoader for csv). These loaders read from a local path, not a stream,
    so each object is downloaded to the Lambda's /tmp before extraction and
    removed right after. JSON and PPTX keep hand-rolled readers -- LangChain's
    JSONLoader needs the `jq` Python binding, a C-extension wheel that's
    awkward to build for Lambda and not worth it for a format this simple,
    and UnstructuredPowerPointLoader drags in the heavy `unstructured`
    package (and its own transitive dependencies) for something `python-pptx`
    reads directly.
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

        path = self._download_to_tempfile(bucket, key, ext)
        try:
            if ext in ("txt", "md"):
                yield from self._read_text_file(bucket, key, path, ext)
            elif ext == "pdf":
                yield from self._read_pdf_file(bucket, key, path)
            elif ext == "docx":
                yield from self._read_docx_file(bucket, key, path)
            elif ext == "csv":
                yield from self._read_csv_file(bucket, key, path)
            elif ext == "json":
                yield from self._read_json_file(bucket, key, path)
            elif ext == "pptx":
                yield from self._read_pptx_file(bucket, key, path)
        finally:
            path.unlink(missing_ok=True)

    def _download_to_tempfile(self, bucket: str, key: str, ext: str) -> Path:
        obj = self.s3_client.get_object(Bucket=bucket, Key=key)
        try:
            body = obj["Body"].read()
        finally:
            obj["Body"].close()

        fd, tmp_name = tempfile.mkstemp(suffix=f".{ext}")
        try:
            with os.fdopen(fd, "wb") as tmp_file:
                tmp_file.write(body)
        except Exception:
            os.unlink(tmp_name)
            raise

        logger.info(f"Downloaded s3://{bucket}/{key} to local tempfile for extraction")
        return Path(tmp_name)

    def _read_text_file(self, bucket: str, key: str, path: Path, ext: str) -> Iterator[ObjectContent]:
        documents = TextLoader(str(path), encoding="utf-8").load()
        text = normalize_text(documents[0].page_content) if documents else ""

        if not text:
            logger.warning(f"Text file is empty after normalization. key={key}")
            return

        logger.info(f"Successfully processed text file via TextLoader: '{key}'")
        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type=ext)

    def _read_pdf_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        documents = PyPDFLoader(str(path)).load()
        logger.info(f"Processing PDF via PyPDFLoader: '{key}' with {len(documents)} page(s)")

        for document in documents:
            try:
                text = normalize_text(document.page_content)

                if not text:
                    continue

                # PyPDFLoader's "page" metadata is 0-indexed; keep parity with
                # the previous PdfReader-based implementation (1-indexed).
                page_number = document.metadata.get("page", 0) + 1
                yield ObjectContent(bucket=bucket, key=key, page=page_number, text=text, file_type="pdf")
            except Exception:
                logger.exception(f"Failed extracting text from a page of key={key}")

    def _read_docx_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        documents = Docx2txtLoader(str(path)).load()
        text = normalize_text(documents[0].page_content) if documents else ""

        if not text:
            logger.warning(f"DOCX file is empty after normalization. key={key}")
            return

        logger.info(f"Successfully processed DOCX file via Docx2txtLoader: '{key}'")
        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="docx")

    def _read_csv_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        # CSVLoader yields one Document per row; joined back into a single
        # page so tag/chunk extraction runs once per file, not once per row
        # (matches the pre-existing single-page-per-file behaviour).
        documents = CSVLoader(str(path)).load()
        text = normalize_text("\n".join(document.page_content for document in documents))

        if not text:
            logger.warning(f"CSV file is empty after normalization. key={key}")
            return

        logger.info(f"Successfully processed CSV file via CSVLoader: '{key}'")
        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="csv")

    def _read_json_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        data = json.loads(path.read_text(encoding="utf-8"))
        text = normalize_text(json.dumps(data, ensure_ascii=False, indent=2))

        if not text:
            logger.warning(f"JSON file is empty after normalization. key={key}")
            return

        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="json")

    def _read_pptx_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        presentation = Presentation(str(path))
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

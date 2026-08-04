import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from langchain_community.document_loaders import (
    CSVLoader,
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
)

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
class StorageServiceData:
    root_dir: Path
    max_file_size_mb: int = 50


class StorageService:
    """Local filesystem stand-in for services/s3.py's S3Service.

    Extraction is delegated to langchain_community.document_loaders wherever
    a lightweight loader exists (txt/md via TextLoader, pdf via PyPDFLoader,
    docx via Docx2txtLoader, csv via CSVLoader). JSON keeps a hand-rolled
    reader: LangChain's JSONLoader needs the `jq` Python binding, which is
    a C-extension wheel that's awkward to install on Windows -- not worth it
    for a format this trivial to read with the stdlib.
    """

    def __init__(self, config: StorageServiceData):
        self.root_dir = config.root_dir
        self.max_file_size_mb = config.max_file_size_mb

    def get_file_content(self, bucket: str, key: str) -> Iterator[ObjectContent]:
        path = self.root_dir / key
        _, ext = os.path.splitext(key)
        ext = ext.lower().lstrip(".")

        self._validate_file_size(path)

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
        else:
            logger.error(f"Unsupported file type '{ext}' for key: '{key}'")
            raise ValueError(f"Unsupported file type: {ext}")

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
            text = normalize_text(document.page_content)
            if not text:
                continue

            # PyPDFLoader's "page" metadata is 0-indexed; keep parity with
            # the original PdfReader-based implementation, which is 1-indexed.
            page_number = document.metadata.get("page", 0) + 1
            yield ObjectContent(bucket=bucket, key=key, page=page_number, text=text, file_type="pdf")

    def _read_docx_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        documents = Docx2txtLoader(str(path)).load()
        text = normalize_text(documents[0].page_content) if documents else ""

        if not text:
            logger.warning(f"DOCX file is empty after normalization. key={key}")
            return

        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="docx")

    def _read_csv_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        # CSVLoader yields one Document per row; joined back into a single
        # page so tag/chunk extraction runs once per file, not once per row
        # (matches the original single-page CSV behaviour).
        documents = CSVLoader(str(path)).load()
        text = normalize_text("\n".join(document.page_content for document in documents))

        if not text:
            logger.warning(f"CSV file is empty after normalization. key={key}")
            return

        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="csv")

    def _read_json_file(self, bucket: str, key: str, path: Path) -> Iterator[ObjectContent]:
        data = json.loads(path.read_text(encoding="utf-8"))
        text = normalize_text(json.dumps(data, ensure_ascii=False, indent=2))

        if not text:
            logger.warning(f"JSON file is empty after normalization. key={key}")
            return

        yield ObjectContent(bucket=bucket, key=key, page=1, text=text, file_type="json")

    def _validate_file_size(self, path: Path) -> None:
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        size_mb = path.stat().st_size / 1024 / 1024

        if size_mb > self.max_file_size_mb:
            logger.error(f"File '{path}' ({size_mb:.2f}MB) exceeds limit of {self.max_file_size_mb}MB")
            raise ValueError(
                f"File exceeds maximum allowed size ({size_mb:.2f}MB > {self.max_file_size_mb}MB)"
            )

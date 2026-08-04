import logging
from dataclasses import dataclass
from typing import Iterator

from langchain_text_splitters import RecursiveCharacterTextSplitter
from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@dataclass(slots=True)
class Chunk:
    index: int
    text: str


@dataclass(slots=True)
class ChunkServiceData:
    chunk_size: int = 2000
    chunk_overlap: int = 300


class ChunkService:
    def __init__(self, config: ChunkServiceData):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap
        )

    def chunk(self, text: str) -> Iterator[Chunk]:
        if not text or not text.strip():
            logger.warning("Input text is empty or contains only whitespace.")
            return

        raw_chunks = self.splitter.split_text(text)

        for index, raw_chunk in enumerate(raw_chunks):
            chunk = normalize_text(raw_chunk)

            if not chunk:
                continue

            yield Chunk(index=index, text=chunk)
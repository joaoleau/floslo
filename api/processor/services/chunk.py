import logging
from dataclasses import dataclass
from typing import Iterator

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


@dataclass(slots=True)
class Chunk:
    index: int
    text: str


@dataclass(slots=True)
class ChunkServiceData:
    chunk_size: int = 2000
    chunk_overlap: int = 200


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

        logger.debug(
            f"Starting chunking process for text "
            f"of length: {len(text)} characters."
        )

        logger.debug("Calling LangChain split_text method...")

        raw_chunks = self.splitter.split_text(text)

        total_raw_chunks = len(raw_chunks)

        logger.info(
            f"LangChain splitter generated "
            f"{total_raw_chunks} raw chunks."
        )

        yielded_chunks = 0

        for index, raw_chunk in enumerate(raw_chunks):
            chunk = normalize_text(raw_chunk)

            if not chunk:
                logger.debug(f"Skipping empty chunk at raw index={index}")
                continue

            yielded_chunks += 1

            logger.debug(
                f"Yielding chunk index={index} "
                f"length={len(chunk)} characters."
            )

            yield Chunk(
                index=index,
                text=chunk
            )

        logger.debug(
            f"Chunking completed. "
            f"Yielded {yielded_chunks} valid chunks "
            f"out of {total_raw_chunks} raw chunks."
        )
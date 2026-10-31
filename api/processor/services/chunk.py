import logging
from dataclasses import dataclass
from typing import Iterator

from .utils import normalize_text

logger = logging.getLogger(__name__)

_DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


@dataclass(slots=True)
class Chunk:
    index: int
    text: str


@dataclass(slots=True)
class ChunkServiceData:
    chunk_size: int = 2000
    chunk_overlap: int = 300
    min_chunk_length: int = 50


class ChunkService:

    def __init__(self, config: ChunkServiceData):
        self.chunk_size = config.chunk_size
        self.chunk_overlap = config.chunk_overlap
        self.min_chunk_length = config.min_chunk_length

    def chunk(self, text: str) -> Iterator[Chunk]:
        if not text or not text.strip():
            logger.warning("Input text is empty or contains only whitespace.")
            return

        raw_chunks = self._split(text, _DEFAULT_SEPARATORS)

        index = 0
        for raw_chunk in raw_chunks:
            chunk = normalize_text(raw_chunk)

            if len(chunk) < self.min_chunk_length:
                if chunk:
                    logger.debug(f"Skipping chunk shorter than {self.min_chunk_length} chars: {chunk!r}")
                continue

            yield Chunk(index=index, text=chunk)
            index += 1

    def _split(self, text: str, separators: list[str]) -> list[str]:
        separator = separators[-1]
        next_separators: list[str] = []

        for i, candidate_separator in enumerate(separators):
            if candidate_separator == "" or candidate_separator in text:
                separator = candidate_separator
                next_separators = separators[i + 1:]
                break

        pieces = list(text) if separator == "" else text.split(separator)

        oversized_split_out: list[str] = []
        small_pieces: list[str] = []

        for piece in pieces:
            if len(piece) > self.chunk_size and next_separators:
                if small_pieces:
                    oversized_split_out.extend(self._merge(small_pieces, separator))
                    small_pieces = []
                oversized_split_out.extend(self._split(piece, next_separators))
            else:
                small_pieces.append(piece)

        if small_pieces:
            oversized_split_out.extend(self._merge(small_pieces, separator))

        return oversized_split_out

    def _merge(self, pieces: list[str], separator: str) -> list[str]:
        merged: list[str] = []
        current: list[str] = []
        current_len = 0

        for piece in pieces:
            sep_len = len(separator) if current else 0
            piece_len = len(piece) + sep_len

            if current and current_len + piece_len > self.chunk_size:
                merged.append(separator.join(current))
                current, current_len = self._carry_overlap(current, separator)

                sep_len = len(separator) if current else 0
                piece_len = len(piece) + sep_len
                if current and current_len + piece_len > self.chunk_size:
                    current, current_len = [], 0
                    piece_len = len(piece)

            current.append(piece)
            current_len += piece_len

        if current:
            merged.append(separator.join(current))

        return merged

    def _carry_overlap(self, pieces: list[str], separator: str) -> tuple[list[str], int]:
        if self.chunk_overlap <= 0:
            return [], 0

        kept: list[str] = []
        kept_len = 0

        for piece in reversed(pieces):
            piece_len = len(piece) + (len(separator) if kept else 0)
            if kept_len + piece_len > self.chunk_overlap:
                break
            kept.insert(0, piece)
            kept_len += piece_len

        return kept, kept_len

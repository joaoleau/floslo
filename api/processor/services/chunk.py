import logging
from dataclasses import dataclass
from typing import Iterator

from .utils import normalize_text

logger = logging.getLogger(__name__)

# Same separator priority LangChain's RecursiveCharacterTextSplitter used: try to
# break on paragraph boundaries first, falling back to progressively smaller units
# only where a piece is still bigger than chunk_size. "" means "split by character",
# always last -- guarantees no chunk is ever returned bigger than chunk_size.
_DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]


@dataclass(slots=True)
class Chunk:
    index: int
    text: str


@dataclass(slots=True)
class ChunkServiceData:
    chunk_size: int = 2000
    chunk_overlap: int = 300


class ChunkService:
    """Hand-rolled recursive character splitter. Replaces
    langchain-text-splitters' RecursiveCharacterTextSplitter -- dropped
    together with the rest of the LangChain dependency chain (see
    api/processor/services/s3.py's docstring) after it pushed the Lambda's
    deployment package past the 250MB unzipped code+layers limit.
    """

    def __init__(self, config: ChunkServiceData):
        self.chunk_size = config.chunk_size
        self.chunk_overlap = config.chunk_overlap

    def chunk(self, text: str) -> Iterator[Chunk]:
        if not text or not text.strip():
            logger.warning("Input text is empty or contains only whitespace.")
            return

        raw_chunks = self._split(text, _DEFAULT_SEPARATORS)

        for index, raw_chunk in enumerate(raw_chunks):
            chunk = normalize_text(raw_chunk)

            if not chunk:
                continue

            yield Chunk(index=index, text=chunk)

    def _split(self, text: str, separators: list[str]) -> list[str]:
        separator = separators[-1]
        next_separators: list[str] = []

        for i, candidate_separator in enumerate(separators):
            if candidate_separator == "" or candidate_separator in text:
                separator = candidate_separator
                next_separators = separators[i + 1:]
                break

        pieces = list(text) if separator == "" else text.split(separator)

        # Pieces still too big for chunk_size get split further on the next
        # (smaller) separator; everything else gets merged back together up
        # to chunk_size, so we don't end up with one chunk per sentence when
        # several sentences would still comfortably fit in one chunk.
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

                # The carried overlap plus this piece can still exceed chunk_size
                # (overlap isn't bounded by how much room a single piece leaves) --
                # if so, drop the overlap for this boundary instead of ever
                # exceeding chunk_size. A piece on its own is always <= chunk_size
                # (oversized pieces are recursively split before reaching _merge),
                # so appending it fresh is always safe.
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
        """Keeps trailing pieces (from the chunk that just closed) whose combined
        length is <= chunk_overlap, so the next chunk starts with a bit of context
        from the previous one instead of a hard cut. A single trailing piece
        already bigger than chunk_overlap on its own is dropped (no overlap
        carried) rather than exceeding the budget."""
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

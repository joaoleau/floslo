import logging
from dataclasses import dataclass
from typing import Iterator

from langchain_text_splitters import MarkdownHeaderTextSplitter, RecursiveCharacterTextSplitter

from .utils import normalize_text

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

try:
    from langchain_text_splitters import TokenTextSplitter
    _TOKEN_SPLITTER_AVAILABLE = True
except ImportError:
    _TOKEN_SPLITTER_AVAILABLE = False

MARKDOWN_HEADERS_TO_SPLIT_ON = [
    ("#", "Header 1"),
    ("##", "Header 2"),
    ("###", "Header 3"),
]


@dataclass(slots=True)
class Chunk:
    index: int
    text: str
    headers: dict[str, str] | None = None


@dataclass(slots=True)
class ChunkServiceData:
    chunk_size: int = 1000
    chunk_overlap: int = 200
    strategy: str = "recursive"  # "recursive" | "markdown" | "token"


class ChunkService:
    """
    strategy="recursive" (default): character-based RecursiveCharacterTextSplitter,
    identical to the original api/processor behaviour.

    strategy="markdown": for .md files, splits on Markdown headers first (so a
    chunk never straddles two sections) via MarkdownHeaderTextSplitter, then
    runs the recursive splitter *inside* each section to still respect
    chunk_size. Every resulting chunk carries its section headers so you can
    see, in output/reports/*.json, exactly which section a chunk belongs to.
    Non-.md files fall back to "recursive".

    strategy="token": splits by token count (tiktoken, cl100k_base) instead
    of raw characters, so chunk_size tracks what an embedding/LLM model
    actually sees rather than an arbitrary character count. Requires the
    `tiktoken` package; the encoding file is fetched once over the network
    on first use and cached locally afterwards (no further internet needed).
    """

    def __init__(self, config: ChunkServiceData):
        self.strategy = config.strategy

        self.recursive_splitter = RecursiveCharacterTextSplitter(
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap
        )

        self.markdown_header_splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=MARKDOWN_HEADERS_TO_SPLIT_ON,
            strip_headers=False
        )

        self.token_splitter = None
        if self.strategy == "token":
            if not _TOKEN_SPLITTER_AVAILABLE:
                raise ImportError(
                    "tiktoken is required for the 'token' chunk strategy. pip install tiktoken"
                )
            self.token_splitter = TokenTextSplitter(
                chunk_size=config.chunk_size,
                chunk_overlap=config.chunk_overlap
            )

    def chunk(self, text: str, file_type: str = "txt") -> Iterator[Chunk]:
        if not text or not text.strip():
            logger.warning("Input text is empty or contains only whitespace.")
            return

        if self.strategy == "markdown" and file_type == "md":
            yield from self._chunk_markdown(text)
        elif self.strategy == "token":
            yield from self._chunk_token(text)
        else:
            yield from self._chunk_recursive(text)

    def _chunk_recursive(self, text: str) -> Iterator[Chunk]:
        raw_chunks = self.recursive_splitter.split_text(text)

        for index, raw_chunk in enumerate(raw_chunks):
            chunk = normalize_text(raw_chunk)
            if not chunk:
                continue
            yield Chunk(index=index, text=chunk)

    def _chunk_markdown(self, text: str) -> Iterator[Chunk]:
        sections = self.markdown_header_splitter.split_text(text)
        index = 0

        for section in sections:
            for raw_chunk in self.recursive_splitter.split_text(section.page_content):
                chunk = normalize_text(raw_chunk)
                if not chunk:
                    continue
                yield Chunk(index=index, text=chunk, headers=dict(section.metadata) or None)
                index += 1

    def _chunk_token(self, text: str) -> Iterator[Chunk]:
        raw_chunks = self.token_splitter.split_text(text)

        for index, raw_chunk in enumerate(raw_chunks):
            chunk = normalize_text(raw_chunk)
            if not chunk:
                continue
            yield Chunk(index=index, text=chunk)

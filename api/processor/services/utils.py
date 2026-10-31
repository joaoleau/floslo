import logging
import re
import unicodedata
import uuid
from urllib.parse import unquote_plus

logger = logging.getLogger(__name__)

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f­​-‏﻿]")


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _CONTROL_CHARS.sub("", text)
    text = re.sub(r"[ \t\f\v]+", " ", text)
    text = re.sub(r"\n(?: \n)+", "\n", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = re.sub(r"(?<![\n.!?:])\n(?!\n)", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" +([,.;:!?])", r"\1", text)
    text = re.sub(r" {2,}", " ", text)

    return text.strip()

def build_id_with_prefix(prefix: str) -> str:
    return f"{prefix}_{str(uuid.uuid4())}"

def build_vector_id(object_id: str, page: int, chunk_index: int) -> str:
    if not object_id:
        raise ValueError("object_id cannot be empty.")
    if page < 1 or chunk_index < 0:
        raise ValueError(f"Invalid chunk position page={page} chunk_index={chunk_index}.")

    return f"vec_{object_id}_{page}_{chunk_index}"

def _words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())

def contains_words(longer: str, shorter: str) -> bool:
    long_words, short_words = _words(longer), _words(shorter)
    if not short_words or len(short_words) > len(long_words):
        return False
    size = len(short_words)
    return any(long_words[i:i + size] == short_words for i in range(len(long_words) - size + 1))

def remove_redundant_keywords(keywords: list[tuple[str, float]]) -> list[tuple[str, float]]:
    final: list[tuple[str, float]] = []
    for keyword, score in sorted(keywords, key=lambda item: len(item[0]), reverse=True):
        if any(contains_words(existing, keyword) for existing, _ in final):
            logger.debug(f"Skipping redundant keyword: '{keyword}'")
            continue
        final.append((keyword, score))
    return final

def decode_s3_key(key: str) -> str:
    return unquote_plus(key)

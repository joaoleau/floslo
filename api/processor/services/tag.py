import logging
from dataclasses import dataclass
import re
from typing import Iterator
from .utils import normalize_text, remove_redundant_keywords

import yake
from langdetect import detect

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    "pt": "pt",
    "en": "en",
    "es": "es",
    "fr": "fr",
    "de": "de",
    "it": "it"
}

@dataclass(slots=True)
class Tag:
    value: str
    score: float

@dataclass(slots=True)
class TagExtractionResult:
    language: str
    tags: list[Tag]

@dataclass(slots=True)
class TagServiceData:
    # Máximo de candidatas que o YAKE devolve para o documento inteiro, as de melhor nota.
    # Variável YAKE_MAX_KEYWORDS. Não há corte por nota: ela muda com o tamanho e o estilo do
    # texto, então um valor fixo cortava quase tudo em um documento e nada em outro. Quem
    # separa candidata boa de ruim é o refinador.
    max_keywords: int = 300
    keyword_ngram_size: int = 3
    min_text_length: int = 50
    min_keyword_length: int = 4
    max_keyword_words: int = 4

class TagService:
    def __init__(self, config: TagServiceData):
        self.max_keywords = config.max_keywords
        self.keyword_ngram_size = config.keyword_ngram_size
        self.min_text_length = config.min_text_length
        self.min_keyword_length = config.min_keyword_length
        self.max_keyword_words = config.max_keyword_words

    def get_tags(self, text: str) -> TagExtractionResult:
        logger.debug(f"Starting tag extraction. Original text length: {len(text)} characters.")
        
        text = normalize_text(text)

        if len(text) < self.min_text_length:
            logger.warning(
                f"Text length ({len(text)}) is below the minimum required "
                f"({self.min_text_length}). Skipping tag extraction."
            )
            return TagExtractionResult(
                language="unknown",
                tags=[]
            )

        language = self._detect_language(text)

        logger.debug(f"Extracting keywords using language '{language}'...")
        keywords = list(
            self._extract_keywords(
                text=text,
                language=language
            )
        )

        logger.debug(
            f"Successfully generated {len(keywords)} tags for text (language={language})."
        )
        logger.debug(f"Final extracted tags: {keywords}")

        return TagExtractionResult(language=language, tags=keywords)

    def _extract_keywords(self, text: str, language: str) -> Iterator[Tag]:
        logger.debug(
            f"Initializing Yake KeywordExtractor (language='{language}', "
            f"ngrams={self.keyword_ngram_size}, top={self.max_keywords})"
        )

        kw_extractor = yake.KeywordExtractor(
            lan=language,
            n=self.keyword_ngram_size,
            top=self.max_keywords
        )

        keywords = kw_extractor.extract_keywords(text)
        keywords = remove_redundant_keywords(keywords)
        logger.debug(f"Yake returned {len(keywords)} raw keywords/phrases.")

        seen = set()

        for keyword, score in keywords:
            original_keyword = keyword
            keyword = keyword.strip().lower()

            if not keyword:
                logger.debug(f"Skipping empty keyword (original was: '{original_keyword}')")
                continue

            if not self._is_valid_keyword(keyword):
                logger.debug(f"Skipping invalid keyword: '{keyword}' (original was: '{original_keyword}')")
                continue

            if keyword in seen:
                logger.debug(f"Skipping duplicate keyword: '{keyword}'")
                continue

            seen.add(keyword)
            logger.debug(f"Yielding tag: '{keyword}' (Yake score: {score:.4f})")
            
            yield Tag(
                value=keyword,
                score=score
            )

    def _detect_language(self, text: str) -> str:
        logger.debug("Attempting to detect language via langdetect...")
        try:
            raw_language = detect(text)
            logger.debug(f"langdetect identified language as: '{raw_language}'")

            normalized_language = SUPPORTED_LANGUAGES.get(
                raw_language,
                "en"
            )
            
            if raw_language not in SUPPORTED_LANGUAGES:
                logger.debug(
                    f"Detected language '{raw_language}' is not in SUPPORTED_LANGUAGES. "
                    f"Falling back to default '{normalized_language}'."
                )

            logger.debug(f"Language settled to: '{normalized_language}'")
            return normalized_language

        except Exception as e:
            logger.exception(f"Failed to detect language due to exception: {e}. Falling back to default 'en'.")
            return "en"

    def _is_valid_keyword(self, keyword: str) -> bool:
        if len(keyword) < self.min_keyword_length:
            return False

        if len(keyword.split()) > self.max_keyword_words:
            return False

        if re.search(r"\d{3,}", keyword):
            return False

        if not re.search(r"[a-zA-ZÀ-ÿ]", keyword):
            return False

        return True
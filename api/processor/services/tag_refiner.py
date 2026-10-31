import json
import logging
import re
from dataclasses import dataclass
from typing import Any, Protocol

logger = logging.getLogger(__name__)

MAX_NEW_TOKENS = 1500

DEFAULT_MAX_TAGS = 200

LANGUAGE_NAMES = {
    "pt": "Portuguese",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
}

_QUOTED_STRING = re.compile(r'"((?:[^"\\]|\\.)*)"')


@dataclass(slots=True)
class DocumentContext:

    language: str | None = None
    filename: str | None = None


class TagRefinerClient(Protocol):
    def refine(self, candidates: list[str], context: DocumentContext | None = None) -> list[str] | None: ...


@dataclass(slots=True)
class TagRefinerData:
    enabled: bool = True
    max_tags: int = DEFAULT_MAX_TAGS


class NoopTagRefinerClient:

    def refine(self, candidates: list[str], context: DocumentContext | None = None) -> list[str] | None:
        return candidates


class BedrockTagRefinerClient:

    def __init__(self, bedrock_runtime_client: Any, model_id: str):
        self.bedrock_runtime_client = bedrock_runtime_client
        self.model_id = model_id

    def refine(self, candidates: list[str], context: DocumentContext | None = None) -> list[str] | None:
        if not candidates:
            return candidates

        prompt = self._build_prompt(candidates, context or DocumentContext())
        logger.info(f"Tag refiner prompt sent to {self.model_id}:\n{prompt}")
        logger.info(f"Tag refiner request: {len(candidates)} candidate(s), prompt of {len(prompt)} chars, model={self.model_id}.")

        raw_text = ""
        stop_reason = None

        try:
            response = self.bedrock_runtime_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps({
                    "messages": [
                        {"role": "user", "content": [{"text": prompt}]}
                    ],
                    "inferenceConfig": {
                        "max_new_tokens": MAX_NEW_TOKENS,
                        "temperature": 0.2,
                        "top_p": 0.9,
                    },
                }),
                contentType="application/json",
                accept="application/json",
            )

            response_body = json.loads(response["body"].read())
            raw_text = response_body["output"]["message"]["content"][0]["text"]
            stop_reason = response_body.get("stopReason")
            usage = response_body.get("usage", {})
            logger.info(
                f"Tag refiner response: stopReason={stop_reason} inputTokens={usage.get('inputTokens')} "
                f"outputTokens={usage.get('outputTokens')}."
            )

            tags = self._parse_tags(raw_text)
            refined = self._dedupe([tag for tag in tags if isinstance(tag, str) and tag.strip()])

            if not refined:
                logger.warning("Tag refiner returned no usable tags.")
                return None

            logger.info(f"Tag refiner selected {len(refined)} tag(s): {refined}")
            self._log_suggestions(refined, candidates)

            if stop_reason == "max_tokens":
                logger.warning(f"Tag refiner response was cut by max_tokens, kept {len(refined)} complete tag(s).")
            return refined

        except Exception:
            logger.exception(
                f"Tag refiner call failed. "
                f"stopReason={stop_reason} response_head={raw_text[:200]!r} response_tail={raw_text[-200:]!r}"
            )
            return None

    def _log_suggestions(self, tags: list[str], candidates: list[str]) -> None:
        known = {candidate.strip().lower() for candidate in candidates}
        suggested = [tag for tag in tags if tag.strip().lower() not in known]
        if suggested:
            logger.info(f"Tag refiner: {len(suggested)} of {len(tags)} tag(s) are not in the candidates: {suggested}")

    def _dedupe(self, tags: list[str]) -> list[str]:
        seen: set[str] = set()
        unique: list[str] = []
        for tag in tags:
            key = tag.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            unique.append(tag.strip())
        return unique

    def _parse_tags(self, raw_text: str) -> list[Any]:
        cleaned = self._clean_json_response(raw_text)

        try:
            parsed = json.loads(cleaned)
        except ValueError:
            return self._salvage_tags(cleaned)

        tags = parsed.get("tags", []) if isinstance(parsed, dict) else []
        return tags if isinstance(tags, list) else []

    def _salvage_tags(self, text: str) -> list[str]:
        start = text.find("[")
        if start == -1:
            return []

        return [json.loads(f'"{match.group(1)}"', strict=False) for match in _QUOTED_STRING.finditer(text, start + 1)]

    def _build_prompt(self, candidates: list[str], context: DocumentContext) -> str:
        candidates_list = "\n".join(f"- {candidate}" for candidate in candidates)
        language_name = LANGUAGE_NAMES.get(context.language or "")
        if language_name:
            language_rule = f"Write every tag in {language_name}, the language of the document."
        else:
            language_rule = "Write every tag in the same language as the candidates."

        context_section = self._build_context_section(context)

        return f"""You curate the tags of a document. The candidates below come from the whole document and were extracted automatically from its text, so they are noisy: many are sentence fragments, contain verbs, have broken or truncated words, or are names of people, publishers and copyright notices.
{context_section}
A tag is a key concept of the material: a noun or a short noun phrase that names a topic, an idea, a theme or a subject. The document can be about anything, so do not assume a field. Tags guide the generation of study challenges and the search for related content.

For each candidate that points to a real concept, write the clean tag:
- Remove verbs, pronouns and filler words, keeping only the concept. "inflation rises sharply" becomes "inflation".
- Fix spelling, accents and broken or truncated words. "articial" becomes "artificial", "photosyn" becomes "photosynthesis".
- Use lowercase and the canonical form (singular when natural).
- Keep it short, ideally 1 to 3 words.
- {language_rule}

Discard candidates that are not a concept: sentence fragments with no topic, names of people or characters, publisher, author, edition or copyright text, and generic words that name nothing (such as "example", "chapter" or "thing"). When several candidates are the same concept, return it once.

You may add a concept when the candidates clearly point to it, but never invent one that the candidates do not support.

Return as many tags as the document really has, and only what it is about: a document with one subject may give a single tag, a dense one may give many. Do not pad the list and do not repeat a tag.

CANDIDATES:
{candidates_list}

Respond ONLY with valid JSON in this exact format:
{{"tags": ["...", "..."]}}
"""

    def _build_context_section(self, context: DocumentContext) -> str:
        if not context.filename:
            return ""

        return f"\nDOCUMENT CONTEXT:\nFILE NAME (it may hint at the title): {context.filename}\n"

    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith("```json"):
            text = text[len("```json"):]
        elif text.startswith("```"):
            text = text[len("```"):]
        if text.endswith("```"):
            text = text[:-len("```")]
        return text.strip()


class TagRefinerService:
    def __init__(self, config: TagRefinerData, client: TagRefinerClient | None = None):
        self.enabled = config.enabled
        self.max_tags = config.max_tags
        self.client = client or NoopTagRefinerClient()

    def refine(self, candidates: list[str], context: DocumentContext | None = None) -> list[str]:
        if not self.enabled or not candidates:
            return candidates

        answer = self.client.refine(candidates, context)
        if answer is None:
            logger.warning(f"Tag refiner failed, falling back to the {len(candidates)} YAKE candidate(s).")
            return candidates[: self.max_tags]

        refined: list[str] = []
        seen: set[str] = set()
        for tag in answer:
            key = tag.strip().lower()
            if not key or key in seen:
                continue
            seen.add(key)
            refined.append(tag.strip())

        logger.info(f"Tag refiner: {len(candidates)} candidate(s) -> {len(refined)} tag(s).")
        return refined[: self.max_tags]

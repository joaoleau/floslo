import json
import logging
from dataclasses import dataclass
from typing import Any, Protocol

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class TagRefinerClient(Protocol):
    def refine(self, candidates: list[str], sample_text: str) -> list[str]: ...


@dataclass(slots=True)
class TagRefinerData:
    enabled: bool = True
    max_tags: int = 7


class NoopTagRefinerClient:
    """Pass-through client. Used when the refiner is disabled."""

    def refine(self, candidates: list[str], sample_text: str) -> list[str]:
        return candidates


class BedrockTagRefinerClient:
    """Uses Bedrock (Nova Lite, same model already provisioned for RAG
    generation) as a filter over YAKE's candidates -- not a generator of new
    tags. Given the candidate list, asks the model to keep only the ones
    that work as standalone tags, dropping sentence fragments, near-dupes
    and overly generic terms.

    Fails open: any error (throttling, malformed JSON, timeout) falls back
    to the original candidates untouched. A refiner hiccup must never fail
    document ingestion or leave a document with zero tags.
    """

    def __init__(self, bedrock_runtime_client: Any, model_id: str):
        self.bedrock_runtime_client = bedrock_runtime_client
        self.model_id = model_id

    def refine(self, candidates: list[str], sample_text: str) -> list[str]:
        if not candidates:
            return candidates

        prompt = self._build_prompt(candidates, sample_text)

        try:
            response = self.bedrock_runtime_client.invoke_model(
                modelId=self.model_id,
                body=json.dumps({
                    "messages": [
                        {"role": "user", "content": [{"text": prompt}]}
                    ],
                    "inferenceConfig": {
                        "max_new_tokens": 500,
                        "temperature": 0.2,
                        "top_p": 0.9,
                    },
                }),
                contentType="application/json",
                accept="application/json",
            )

            response_body = json.loads(response["body"].read())
            raw_text = response_body["output"]["message"]["content"][0]["text"]
            cleaned = self._clean_json_response(raw_text)

            parsed = json.loads(cleaned)
            tags = parsed.get("tags", [])

            if not isinstance(tags, list) or not tags:
                logger.warning("Tag refiner returned no usable tags, falling back to YAKE candidates.")
                return candidates

            refined = [tag for tag in tags if isinstance(tag, str) and tag.strip()]
            return refined or candidates

        except Exception:
            logger.exception("Tag refiner call failed, falling back to YAKE candidates unchanged.")
            return candidates

    def _build_prompt(self, candidates: list[str], sample_text: str) -> str:
        candidates_list = "\n".join(f"- {candidate}" for candidate in candidates)

        sample_section = ""
        if sample_text:
            sample_section = f"""
Here is a sample of the document's actual text, so you know what these
candidates are about (the full document is longer than this sample):

SAMPLE TEXT:
{sample_text}
"""

        return f"""You are filtering candidate keywords that were automatically extracted from a document.
{sample_section}
Given this list of candidate keywords, return ONLY the ones that work as standalone tags a user could filter or search by. Drop sentence fragments, overly generic words, near-duplicates, and anything that doesn't stand alone as a topic or concept. Do not invent new keywords, only select from the candidates given.

CANDIDATES:
{candidates_list}

Respond ONLY with valid JSON in this exact format:
{{"tags": ["...", "..."]}}
"""

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

    def refine(self, candidates: list[str], sample_text: str = "") -> list[str]:
        if not self.enabled or not candidates:
            return candidates

        refined = self.client.refine(candidates, sample_text)
        if not refined:
            refined = candidates

        logger.info(f"Tag refiner: {len(candidates)} candidate(s) -> {len(refined)} refined.")
        return refined[: self.max_tags]

import logging
from dataclasses import dataclass
from typing import Protocol

from langsmith import traceable

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

_FRAGMENT_LEADING_WORDS = {
    "and", "or", "but", "the", "a", "an", "of", "in", "on", "for", "with", "to"
}


class TagRefinerClient(Protocol):
    def refine(self, candidates: list[str], text: str) -> list[str]: ...


@dataclass(slots=True)
class TagRefinerData:
    enabled: bool = False
    max_tags: int = 7


class NoopTagRefinerClient:
    """Pass-through client. Used when the refiner is disabled or wired with
    no backing client -- candidates flow through unchanged."""

    def refine(self, candidates: list[str], text: str) -> list[str]:
        return candidates


class SimulatedLLMTagRefinerClient:
    """
    Local, offline stand-in for an LLM-based tag refiner. It approximates
    what an LLM call would do -- drop sentence-fragment candidates, keep the
    rest -- using cheap heuristics, purely so the "YAKE candidates -> refine
    -> final tags" pipeline shape exists and can be exercised end-to-end
    without an API key or network call.

    This is NOT a quality substitute for a real LLM call. It exists so the
    integration point (TagRefinerService.refine) is already wired into
    ProcessorHandler when you're ready to swap this class for a real one.

    TODO (production, api/processor): implement a BedrockTagRefinerClient
    that calls bedrock_runtime_client.converse(...) with a prompt along the
    lines of:

        "Given this text and these candidate keywords extracted by YAKE,
         return only the ones that work as standalone tags a user would
         filter by. Drop sentence fragments and near-duplicates.
         Respond as JSON: {"tags": [...]}"

    and parses the structured response into list[str]. Swap it in via the
    same `client` constructor argument used here -- no other code changes
    needed in ProcessorHandler.
    """

    def refine(self, candidates: list[str], text: str) -> list[str]:
        cleaned = []
        for candidate in candidates:
            words = candidate.split()
            if len(words) < 2:
                continue
            if words[0].lower() in _FRAGMENT_LEADING_WORDS:
                continue
            cleaned.append(candidate)

        return cleaned or candidates


class TagRefinerService:
    def __init__(self, config: TagRefinerData, client: TagRefinerClient | None = None):
        self.enabled = config.enabled
        self.max_tags = config.max_tags
        self.client = client or NoopTagRefinerClient()

    @traceable(run_type="tool", name="refine_tags")
    def refine(self, candidates: list[str], text: str) -> list[str]:
        if not self.enabled or not candidates:
            return candidates

        refined = self.client.refine(candidates, text)
        logger.debug(f"Tag refiner: {len(candidates)} candidate(s) -> {len(refined)} refined.")
        return refined[: self.max_tags]

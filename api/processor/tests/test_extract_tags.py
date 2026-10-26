import importlib.util
import pathlib
import unittest
from dataclasses import dataclass, field
from unittest.mock import MagicMock
import sys

_HANDLER = pathlib.Path(__file__).resolve().parents[1] / "handlers" / "processor.py"


def _load_handler_module():
    # O handler importa o pacote `services` inteiro (pypdf, yake, boto3...). Só ProcessorHandler
    # (e a lógica pura de _extract_tags) interessa aqui, então o pacote é trocado por um falso
    # durante o import e devolvido ao que era depois -- mesma técnica de test_clip_tags.py.
    previous = sys.modules.get("services")
    sys.modules["services"] = MagicMock()
    try:
        spec = importlib.util.spec_from_file_location("processor_handler_under_test_extract_tags", _HANDLER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            sys.modules.pop("services", None)
        else:
            sys.modules["services"] = previous


_handler_module = _load_handler_module()


@dataclass
class FakeTag:
    value: str
    score: float = 0.01


@dataclass
class FakeTagResult:
    language: str
    tags: list


class FakeTagService:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error
        self.texts_received: list[str] = []

    def get_tags(self, text):
        self.texts_received.append(text)
        if self.error:
            raise self.error
        return self.result


@dataclass
class FakeTagCandidates:
    calls: list = field(default_factory=list)

    def add_page(self, tags, language=None):
        self.calls.append((list(tags), language))


def make_handler(tag_service):
    config = _handler_module.HandlerData(
        s3_service=None,
        tag_service=tag_service,
        embedding_service=None,
        vector_service=None,
        chunk_service=None,
        dynamo_service=None,
        tag_refiner=None,
    )
    return _handler_module.ProcessorHandler(config)


class ExtractTagsTests(unittest.TestCase):
    def test_extracts_tags_from_the_given_text_and_returns_the_language(self):
        tags = [FakeTag("hash"), FakeTag("grafo")]
        tag_service = FakeTagService(result=FakeTagResult(language="pt", tags=tags))
        handler = make_handler(tag_service)
        candidates = FakeTagCandidates()

        language = handler._extract_tags("obj-key", 5, "texto da janela", candidates)

        self.assertEqual(language, "pt")
        self.assertEqual(tag_service.texts_received, ["texto da janela"])
        self.assertEqual(candidates.calls, [(tags, "pt")])

    def test_a_failed_extraction_still_counts_the_position_and_returns_unknown(self):
        tag_service = FakeTagService(error=RuntimeError("boom"))
        handler = make_handler(tag_service)
        candidates = FakeTagCandidates()

        with self.assertLogs(_handler_module.logger.name, level="ERROR"):
            language = handler._extract_tags("obj-key", 12, "texto", candidates)

        self.assertEqual(language, "unknown")
        self.assertEqual(candidates.calls, [([], None)])


if __name__ == "__main__":
    unittest.main()

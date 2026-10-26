import importlib.util
import pathlib
import sys
import unittest
from unittest.mock import MagicMock

_HANDLER = pathlib.Path(__file__).resolve().parents[1] / "handlers" / "processor.py"


def _load_clip_tags():
    # O handler importa o pacote `services` inteiro (pypdf, yake, boto3...). Só _clip_tags interessa
    # aqui, então o pacote é trocado por um falso durante o import e depois devolvido ao que era.
    previous = sys.modules.get("services")
    sys.modules["services"] = MagicMock()
    try:
        spec = importlib.util.spec_from_file_location("processor_handler_under_test", _HANDLER)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module._clip_tags
    finally:
        if previous is None:
            sys.modules.pop("services", None)
        else:
            sys.modules["services"] = previous


_clip_tags = _load_clip_tags()


class ClipTagsTests(unittest.TestCase):
    def test_surrounding_whitespace_is_trimmed(self):
        self.assertEqual(_clip_tags(["  tabela hash  ", "\tgrafo\n"]), ["tabela hash", "grafo"])

    def test_a_tag_that_becomes_a_duplicate_after_trimming_is_kept_once(self):
        self.assertEqual(_clip_tags(["grafo", " grafo ", "grafo"]), ["grafo"])

    def test_empty_tags_are_dropped(self):
        self.assertEqual(_clip_tags(["", "   ", "hash"]), ["hash"])

    def test_the_order_of_the_tags_is_kept(self):
        self.assertEqual(_clip_tags(["c", "a", "b"]), ["c", "a", "b"])

    def test_a_tag_longer_than_the_limit_is_dropped_never_cut(self):
        self.assertEqual(_clip_tags(["x" * 33, "ok"], max_length=32), ["ok"])
        self.assertEqual(_clip_tags(["x" * 32], max_length=32), ["x" * 32])

    def test_the_limit_counts_characters_not_bytes(self):
        self.assertEqual(_clip_tags(["ç" * 32], max_length=32), ["ç" * 32])

    def test_hyphens_are_left_as_they_are(self):
        self.assertEqual(_clip_tags(["caso-base", "k-vizinhos"]), ["caso-base", "k-vizinhos"])


if __name__ == "__main__":
    unittest.main()

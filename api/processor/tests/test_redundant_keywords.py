import pathlib
import sys
import types
import unittest

# Carrega só services/utils: o __init__.py do pacote importa pypdf, yake etc., que não são
# necessários para testar o filtro de candidatas redundantes.
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services.utils import contains_words, remove_redundant_keywords  # noqa: E402


def _kept(keywords: list[str]) -> list[str]:
    return sorted(keyword for keyword, _ in remove_redundant_keywords([(k, 0.01) for k in keywords]))


class ContainsWordsTests(unittest.TestCase):
    def test_a_word_inside_a_longer_phrase(self):
        self.assertTrue(contains_words("rede neural", "rede"))
        self.assertTrue(contains_words("usando tabelas hash", "tabelas hash"))

    def test_a_piece_of_another_word_does_not_count(self):
        self.assertFalse(contains_words("parede", "rede"))
        self.assertFalse(contains_words("parte do sistema", "arte"))

    def test_the_words_must_be_in_sequence(self):
        self.assertFalse(contains_words("hash de tabelas", "tabelas hash"))

    def test_case_and_punctuation_are_ignored(self):
        self.assertTrue(contains_words("Rede Neural, profunda", "rede neural"))

    def test_empty_or_longer_never_matches(self):
        self.assertFalse(contains_words("rede", ""))
        self.assertFalse(contains_words("rede", "rede neural"))


class RemoveRedundantKeywordsTests(unittest.TestCase):
    def test_keeps_the_more_specific_phrase(self):
        self.assertEqual(_kept(["rede", "rede neural"]), ["rede neural"])

    def test_does_not_drop_a_word_that_only_looks_like_part_of_another(self):
        self.assertEqual(_kept(["rede", "parede"]), ["parede", "rede"])
        self.assertEqual(_kept(["arte", "parte do sistema"]), ["arte", "parte do sistema"])

    def test_keeps_the_score_of_each_kept_keyword(self):
        kept = remove_redundant_keywords([("rede", 0.02), ("rede neural", 0.01), ("parede", 0.05)])
        self.assertIn(("rede neural", 0.01), kept)
        self.assertIn(("parede", 0.05), kept)


if __name__ == "__main__":
    unittest.main()

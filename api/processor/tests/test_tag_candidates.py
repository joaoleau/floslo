import pathlib
import sys
import types
import unittest
from dataclasses import dataclass

# Carrega só services/tag_candidates: o __init__.py do pacote importa pypdf, yake etc.
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services.tag_candidates import DEFAULT_BANDS, TagCandidates  # noqa: E402


@dataclass
class FakeTag:
    value: str
    score: float = 0.01


def page(*values):
    return [FakeTag(value) for value in values]


def scored(*pairs):
    return [FakeTag(value, score) for value, score in pairs]


def one_tag_per_page(count, bands=DEFAULT_BANDS):
    candidates = TagCandidates(bands=bands)
    for number in range(count):
        candidates.add_page(page(f"t{number}"))
    return candidates


class InterleavingTests(unittest.TestCase):
    def test_the_list_alternates_between_the_bands_of_the_document(self):
        candidates = one_tag_per_page(6, bands=3)

        # Faixas: t0 e t1, t2 e t3, t4 e t5. Uma de cada por rodada.
        self.assertEqual(candidates.values(), ["t0", "t2", "t4", "t1", "t3", "t5"])

    def test_the_limit_takes_from_every_band_not_only_from_the_start(self):
        candidates = one_tag_per_page(8, bands=4)

        self.assertEqual(candidates.values(4), ["t0", "t2", "t4", "t6"])

    def test_a_large_limit_spreads_evenly_over_a_long_document(self):
        candidates = one_tag_per_page(1500)

        limited = candidates.values(1000)
        per_band = [0] * DEFAULT_BANDS
        for value in limited:
            per_band[int(value[1:]) * DEFAULT_BANDS // 1500] += 1

        self.assertEqual(len(limited), 1000)
        self.assertEqual(len(set(limited)), 1000)
        self.assertEqual(per_band, [100] * DEFAULT_BANDS)
        self.assertEqual(len(candidates), 1500)

    def test_within_a_band_the_order_of_the_document_is_kept(self):
        candidates = TagCandidates(bands=1)
        candidates.add_page(page("c", "a", "b"))

        self.assertEqual(candidates.values(), ["c", "a", "b"])

    def test_the_yake_score_does_not_change_the_order(self):
        candidates = TagCandidates(bands=1)
        candidates.add_page(scored(("ruim", 0.08), ("boa", 0.001), ("media", 0.03)))
        candidates.add_page(scored(("depois", 0.0001)))

        # Um score bem melhor não passa à frente de quem apareceu antes.
        self.assertEqual(candidates.values(), ["ruim", "boa", "media", "depois"])

    def test_a_candidate_seen_on_several_pages_keeps_its_first_band(self):
        candidates = TagCandidates(bands=2)
        candidates.add_page(scored(("comum", 0.05), ("outra", 0.02)))
        candidates.add_page(scored(("nova", 0.04), ("comum", 0.001)))

        # "comum" fica na faixa da página em que apareceu primeiro.
        self.assertEqual(candidates.values(), ["comum", "nova", "outra"])
        self.assertEqual(len(candidates), 3)

    def test_a_document_with_fewer_pages_than_bands_uses_one_band_per_page(self):
        candidates = TagCandidates(bands=10)
        candidates.add_page(page("a1", "a2"))
        candidates.add_page(page("b1", "b2"))

        self.assertEqual(candidates.values(), ["a1", "b1", "a2", "b2"])

    def test_pages_without_tags_still_count_for_the_position_in_the_book(self):
        candidates = TagCandidates(bands=2)
        candidates.add_page(page("inicio"))
        candidates.add_page([])
        candidates.add_page([])
        candidates.add_page(page("fim"))

        self.assertEqual(candidates.values(), ["inicio", "fim"])


class BandsTests(unittest.TestCase):
    def test_the_candidates_come_grouped_by_band_in_document_order(self):
        candidates = one_tag_per_page(6, bands=3)

        self.assertEqual(candidates.bands(), [["t0", "t1"], ["t2", "t3"], ["t4", "t5"]])

    def test_a_band_without_candidates_is_left_out(self):
        candidates = TagCandidates(bands=3)
        candidates.add_page(page("inicio"))
        candidates.add_page([])
        candidates.add_page([])
        candidates.add_page([])
        candidates.add_page([])
        candidates.add_page(page("fim"))

        self.assertEqual(candidates.bands(), [["inicio"], ["fim"]])

    def test_the_total_limit_is_split_between_the_bands(self):
        candidates = one_tag_per_page(100, bands=10)

        bands = candidates.bands(30)

        self.assertEqual(len(bands), 10)
        for band in bands:
            self.assertEqual(len(band), 3)

    def test_a_limit_smaller_than_the_number_of_bands_still_keeps_one_each(self):
        candidates = one_tag_per_page(20, bands=10)

        bands = candidates.bands(3)

        self.assertEqual(len(bands), 10)
        for band in bands:
            self.assertEqual(len(band), 1)

    def test_without_a_limit_every_candidate_is_there(self):
        candidates = one_tag_per_page(50, bands=5)

        self.assertEqual(sum(len(band) for band in candidates.bands()), 50)

    def test_a_document_without_candidates_has_no_bands(self):
        self.assertEqual(TagCandidates().bands(), [])
        self.assertEqual(TagCandidates().bands(10), [])


class TagCandidatesTests(unittest.TestCase):
    def test_every_candidate_of_every_page_is_kept_once(self):
        candidates = TagCandidates()
        candidates.add_page(page("tabela hash", "jenny"))
        candidates.add_page(page("grafo", "pinky", "jenny"))

        self.assertEqual(sorted(candidates.values()), ["grafo", "jenny", "pinky", "tabela hash"])
        self.assertEqual(len(candidates), 4)

    def test_without_a_limit_nothing_is_cut(self):
        self.assertEqual(len(one_tag_per_page(2000).values()), 2000)

    def test_a_limit_above_the_total_returns_everything(self):
        candidates = TagCandidates()
        candidates.add_page(page("a", "b"))
        self.assertEqual(sorted(candidates.values(1000)), ["a", "b"])

    def test_long_candidates_are_not_filtered_here(self):
        candidates = TagCandidates()
        long_value = "x" * 80
        candidates.add_page(page(long_value))

        self.assertEqual(candidates.values(), [long_value])

    def test_a_document_without_candidates_has_none(self):
        candidates = TagCandidates()
        self.assertEqual(candidates.values(), [])
        self.assertEqual(len(candidates), 0)

    def test_a_document_where_no_page_had_tags_has_none(self):
        candidates = TagCandidates()
        candidates.add_page([])
        candidates.add_page([])
        self.assertEqual(candidates.values(), [])

    def test_the_dominant_language_is_the_one_of_most_pages(self):
        candidates = TagCandidates()
        candidates.add_page(page("a"), "en")
        candidates.add_page(page("b"), "pt")
        candidates.add_page(page("c"), "pt")

        self.assertEqual(candidates.dominant_language(), "pt")

    def test_unknown_or_missing_languages_do_not_count(self):
        candidates = TagCandidates()
        self.assertIsNone(candidates.dominant_language())
        candidates.add_page(page("a"), "unknown")
        candidates.add_page(page("b"))
        self.assertIsNone(candidates.dominant_language())
        candidates.add_page(page("c"), "es")
        self.assertEqual(candidates.dominant_language(), "es")


if __name__ == "__main__":
    unittest.main()

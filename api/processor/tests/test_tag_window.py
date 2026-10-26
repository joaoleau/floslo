import pathlib
import sys
import types
import unittest

# Carrega só services/tag_window: o __init__.py do pacote importa pypdf, yake etc.
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services.tag_window import TagWindowBuffer  # noqa: E402


class TagWindowBufferTests(unittest.TestCase):
    def test_accumulates_until_it_reaches_the_window_size(self):
        buffer = TagWindowBuffer(10)

        self.assertIsNone(buffer.add("abcd"))
        self.assertIsNone(buffer.add("efg"))
        self.assertEqual(buffer.add("hij"), "abcd\nefg\nhij")

    def test_never_cuts_a_page_in_half_even_past_the_window_size(self):
        buffer = TagWindowBuffer(5)

        self.assertEqual(buffer.add("this page alone is already 20 chars"), "this page alone is already 20 chars")

    def test_a_page_that_exactly_reaches_the_window_size_closes_it(self):
        buffer = TagWindowBuffer(4)

        self.assertEqual(buffer.add("abcd"), "abcd")

    def test_restarts_accumulating_after_closing_a_window(self):
        buffer = TagWindowBuffer(4)

        self.assertEqual(buffer.add("abcd"), "abcd")
        self.assertIsNone(buffer.add("ef"))
        self.assertEqual(buffer.add("gh"), "ef\ngh")

    def test_flush_returns_whatever_is_left_and_clears_the_buffer(self):
        buffer = TagWindowBuffer(100)
        buffer.add("a")
        buffer.add("b")

        self.assertEqual(buffer.flush(), "a\nb")
        self.assertIsNone(buffer.flush())

    def test_flush_on_an_empty_buffer_returns_none(self):
        self.assertIsNone(TagWindowBuffer(100).flush())

    def test_flush_after_a_window_just_closed_returns_none(self):
        buffer = TagWindowBuffer(4)
        buffer.add("abcd")

        self.assertIsNone(buffer.flush())

    def test_rejects_a_non_positive_window_size(self):
        with self.assertRaises(ValueError):
            TagWindowBuffer(0)
        with self.assertRaises(ValueError):
            TagWindowBuffer(-1)


if __name__ == "__main__":
    unittest.main()

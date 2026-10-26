import pathlib
import re
import unittest

# Lê os arquivos como texto pelo mesmo motivo de test_yake_limit.py: evita importar boto3, yake
# e langdetect só pra conferir um número.
_PROCESSOR = pathlib.Path(__file__).resolve().parents[1]
_TEMPLATE = _PROCESSOR.parent / "template.yml"

# TAG_WINDOW_CHARS: 0 extrai tags por página; um valor positivo junta páginas seguidas até esse
# tamanho antes de extrair (ver TagWindowBuffer). O padrão é positivo (janela ligada), não 0.
DEFAULT_WINDOW_CHARS = 8000


class TagWindowDefaultTests(unittest.TestCase):
    def test_the_handler_default_matches(self):
        source = (_PROCESSOR / "handlers" / "processor.py").read_text(encoding="utf-8")
        match = re.search(r"TAG_WINDOW_CHARS = (\d+)", source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), DEFAULT_WINDOW_CHARS)

    def test_the_config_default_matches(self):
        source = (_PROCESSOR / "config" / "config.py").read_text(encoding="utf-8")
        match = re.search(r'TAG_WINDOW_CHARS",\s*"(\d+)"', source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), DEFAULT_WINDOW_CHARS)

    def test_the_template_matches(self):
        source = _TEMPLATE.read_text(encoding="utf-8")
        match = re.search(r'TAG_WINDOW_CHARS:\s*"(\d+)"', source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), DEFAULT_WINDOW_CHARS)

    def test_the_default_is_positive_so_windowing_is_on_by_default(self):
        self.assertGreater(DEFAULT_WINDOW_CHARS, 0)


if __name__ == "__main__":
    unittest.main()

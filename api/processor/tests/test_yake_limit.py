import pathlib
import re
import unittest

# Lê os arquivos como texto: o tag.py importa yake e langdetect, e config.py importa boto3, que
# não são necessários para conferir o limite de tags por extração.
_PROCESSOR = pathlib.Path(__file__).resolve().parents[1]
_TEMPLATE = _PROCESSOR.parent / "template.yml"

# Máximo de candidatas que o YAKE devolve para o documento inteiro (uma extração só).
MAX_KEYWORDS_PER_EXTRACTION = 300


class YakeLimitTests(unittest.TestCase):
    def test_the_tag_service_default_matches(self):
        source = (_PROCESSOR / "services" / "tag.py").read_text(encoding="utf-8")
        match = re.search(r"max_keywords: int = (\d+)", source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), MAX_KEYWORDS_PER_EXTRACTION)

    def test_the_config_default_matches(self):
        source = (_PROCESSOR / "config" / "config.py").read_text(encoding="utf-8")
        match = re.search(r'YAKE_MAX_KEYWORDS",\s*"(\d+)"', source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), MAX_KEYWORDS_PER_EXTRACTION)

    def test_the_template_matches(self):
        source = _TEMPLATE.read_text(encoding="utf-8")
        match = re.search(r'YAKE_MAX_KEYWORDS:\s*"(\d+)"', source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), MAX_KEYWORDS_PER_EXTRACTION)

    def test_the_limit_is_the_only_yake_tuning_passed_to_the_extractor(self):
        # A lib tem outros parâmetros (window_size de coocorrência, dedup_lim...), mas nenhum foi
        # ajustado: só o idioma, o tamanho do n-grama e esse limite.
        source = (_PROCESSOR / "services" / "tag.py").read_text(encoding="utf-8")
        self.assertIn("top=self.max_keywords", source)
        self.assertNotIn("window_size=", source)


if __name__ == "__main__":
    unittest.main()

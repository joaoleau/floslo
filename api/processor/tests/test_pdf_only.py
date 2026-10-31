import pathlib
import re
import unittest

# Lê os arquivos como texto, pelo mesmo motivo de test_yake_limit.py: confere a configuração sem
# importar pypdf, yake e boto3.
_PROCESSOR = pathlib.Path(__file__).resolve().parents[1]
_TEMPLATE = _PROCESSOR.parent / "template.yml"

MAX_FILE_SIZE_MB = 50


class PdfOnlyTests(unittest.TestCase):
    def test_the_processor_reads_only_pdf(self):
        source = (_PROCESSOR / "services" / "s3.py").read_text(encoding="utf-8")
        self.assertIn('SUPPORTED_EXTENSIONS = {"pdf"}', source)
        for removed in ("docx2txt", "pptx", "_read_text_file", "_read_csv_file", "_read_json_file"):
            self.assertNotIn(removed, source)

    def test_the_readers_of_other_formats_are_not_installed(self):
        requirements = (_PROCESSOR / "requirements.txt").read_text(encoding="utf-8").split()
        self.assertNotIn("docx2txt", requirements)
        self.assertNotIn("python-pptx", requirements)

    def test_the_bucket_only_notifies_pdf_uploads(self):
        source = _TEMPLATE.read_text(encoding="utf-8")
        self.assertEqual(re.findall(r"Name: suffix\s+Value: (\S+)", source), [".pdf"])


class MaxFileSizeTests(unittest.TestCase):
    def test_the_s3_service_default_matches(self):
        source = (_PROCESSOR / "services" / "s3.py").read_text(encoding="utf-8")
        self.assertIn(f"max_file_size_mb: int = {MAX_FILE_SIZE_MB}", source)

    def test_the_config_default_matches(self):
        source = (_PROCESSOR / "config" / "config.py").read_text(encoding="utf-8")
        match = re.search(r'MAX_FILE_SIZE_MB",\s*"(\d+)"', source)
        self.assertIsNotNone(match)
        self.assertEqual(int(match.group(1)), MAX_FILE_SIZE_MB)

    def test_the_template_matches_for_the_processor_and_the_api(self):
        source = _TEMPLATE.read_text(encoding="utf-8")
        self.assertEqual(re.findall(r'MAX_FILE_SIZE_MB: "(\d+)"', source), [str(MAX_FILE_SIZE_MB)])
        self.assertEqual(re.findall(r'MAX_UPLOAD_SIZE_MB: "(\d+)"', source), [str(MAX_FILE_SIZE_MB)])


if __name__ == "__main__":
    unittest.main()

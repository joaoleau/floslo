import pathlib
import sys
import types
import unittest

# Carrega só services/utils: o __init__.py do pacote importa pypdf, yake etc.
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services.utils import decode_s3_key  # noqa: E402


class DecodeS3KeyTests(unittest.TestCase):
    def test_plus_becomes_space(self):
        self.assertEqual(
            decode_s3_key("tenants/u1/context/obj_1/Entendendo+Algoritmos.pdf"),
            "tenants/u1/context/obj_1/Entendendo Algoritmos.pdf",
        )

    def test_percent_sequences_are_decoded(self):
        self.assertEqual(decode_s3_key("a/Aula%3A+%C3%A7%C3%A3o+%281%29.pdf"), "a/Aula: ção (1).pdf")

    def test_encoded_plus_stays_a_plus(self):
        self.assertEqual(decode_s3_key("a/c%2B%2B.pdf"), "a/c++.pdf")

    def test_plain_key_is_unchanged(self):
        self.assertEqual(decode_s3_key("tenants/u1/context/obj_1/notes.txt"), "tenants/u1/context/obj_1/notes.txt")


if __name__ == "__main__":
    unittest.main()

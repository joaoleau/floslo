import pathlib
import sys
import types
import unittest

# Carrega só services/utils e services/chunk: o __init__.py do pacote importa pypdf, yake etc.,
# que não são necessários para testar a limpeza do texto.
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services.chunk import ChunkService, ChunkServiceData  # noqa: E402
from services.utils import normalize_text  # noqa: E402


class NormalizeTextTest(unittest.TestCase):
    def test_joins_visual_line_breaks_inside_a_sentence(self):
        self.assertEqual(
            normalize_text("A ideia é de\notimizar a busca\nbinária."),
            "A ideia é de otimizar a busca binária.",
        )

    def test_keeps_the_line_break_after_a_sentence_end(self):
        self.assertEqual(normalize_text("Primeira frase.\nSegunda frase"), "Primeira frase.\nSegunda frase")

    def test_keeps_paragraphs(self):
        self.assertEqual(normalize_text("Um parágrafo\n\n\n\nOutro"), "Um parágrafo\n\nOutro")

    def test_rejoins_a_word_hyphenated_at_the_line_break(self):
        self.assertEqual(normalize_text("Gon-\nçalves e Cana-\nbarro"), "Gonçalves e Canabarro")

    def test_undoes_ligatures(self):
        self.assertEqual(normalize_text("desaﬁos e ﬂuxos"), "desafios e fluxos")

    def test_one_word_per_line_with_tabs(self):
        # Como sai o livro de História: uma palavra por linha, tabulações no lugar dos espaços.
        self.assertEqual(
            normalize_text("OLANDA\n,\t \nO\n\t\nCAMINHO\n\t\nABERTO"),
            "OLANDA, O CAMINHO ABERTO",
        )

    def test_removes_control_characters_and_non_breaking_spaces(self):
        self.assertEqual(normalize_text("Em\x00 um\xa0fluxo\x07, cada­registro"), "Em um fluxo, cadaregistro")

    def test_is_idempotent(self):
        text = normalize_text("Linha\nquebrada.\nOutra\tlinha\n\nParágrafo")
        self.assertEqual(normalize_text(text), text)


class MinChunkLengthTest(unittest.TestCase):
    def _service(self, min_chunk_length: int) -> ChunkService:
        return ChunkService(ChunkServiceData(chunk_size=60, chunk_overlap=0, min_chunk_length=min_chunk_length))

    def test_drops_a_chunk_shorter_than_the_minimum(self):
        self.assertEqual(list(self._service(50).chunk("Code generation")), [])

    def test_keeps_the_index_without_gaps(self):
        text = "Uma frase longa o bastante para ficar.\n\nCurta.\n\nOutra frase longa o bastante para ficar."
        chunks = list(self._service(20).chunk(text))
        self.assertEqual([chunk.index for chunk in chunks], [0, 1])
        self.assertNotIn("Curta.", [chunk.text for chunk in chunks])


if __name__ == "__main__":
    unittest.main()

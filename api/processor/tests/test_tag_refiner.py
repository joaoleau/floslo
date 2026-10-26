import io
import json
import logging
import pathlib
import sys
import types
import unittest

# Carrega só services/tag_refiner (só usa a biblioteca padrão).
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services import tag_refiner  # noqa: E402
from services.tag_refiner import (  # noqa: E402
    BedrockTagRefinerClient,
    DocumentContext,
    TagRefinerData,
    TagRefinerService,
)


class FakeBedrock:
    def __init__(self, text=None, stop_reason="end_turn", error=None):
        self.text = text
        self.stop_reason = stop_reason
        self.error = error
        self.requests = []

    def invoke_model(self, **kwargs):
        self.requests.append(json.loads(kwargs["body"]))
        if self.error:
            raise self.error
        body = {
            "output": {"message": {"content": [{"text": self.text}]}},
            "stopReason": self.stop_reason,
            "usage": {"inputTokens": 10, "outputTokens": 20},
        }
        return {"body": io.BytesIO(json.dumps(body).encode("utf-8"))}


_KNOWN = ["dijkstra", "tabela hash", "redes sociais", "facebook", "pesos negativos", "hash", "programação", 'a"b']
CANDIDATES = [f"conceito {index}" for index in range(30)] + _KNOWN + [f"t{index}" for index in range(20)]


class silenced:
    def __enter__(self):
        self._previous = logging.root.manager.disable
        logging.disable(logging.CRITICAL)

    def __exit__(self, *exc):
        logging.disable(self._previous)


def refine(text=None, stop_reason="end_turn", error=None):
    bedrock = FakeBedrock(text, stop_reason, error)
    client = BedrockTagRefinerClient(bedrock, "model")
    with silenced():
        return client.refine(CANDIDATES), bedrock


class BedrockTagRefinerTests(unittest.TestCase):
    def test_a_valid_answer_is_returned_as_is(self):
        tags, _ = refine('{"tags": ["dijkstra", "tabela hash"]}')
        self.assertEqual(tags, ["dijkstra", "tabela hash"])

    def test_a_json_wrapped_in_a_code_fence_is_read(self):
        tags, _ = refine('```json\n{"tags": ["dijkstra"]}\n```')
        self.assertEqual(tags, ["dijkstra"])

    def test_the_request_caps_the_answer_of_a_band(self):
        _, bedrock = refine('{"tags": ["dijkstra"]}')
        self.assertEqual(bedrock.requests[0]["inferenceConfig"]["max_new_tokens"], tag_refiner.MAX_NEW_TOKENS)
        # Folga grande para as poucas dezenas de tags de uma faixa, sem pagar um laço inteiro.
        self.assertGreaterEqual(tag_refiner.MAX_NEW_TOKENS, 1000)

    def test_a_truncated_answer_keeps_the_complete_tags(self):
        # Formato do log real: cortada no meio da última string, com repetições.
        text = '{"tags": ["pesos negativos", "dijkstra", "redes sociais", "facebook", "pyth'
        tags, _ = refine(text, stop_reason="max_tokens")
        self.assertEqual(tags, ["pesos negativos", "dijkstra", "redes sociais", "facebook"])

    def test_a_looping_answer_is_deduplicated_keeping_the_first_occurrence(self):
        text = '{"tags": ["dijkstra", "redes sociais", "facebook", "redes sociais", "facebook", "Dijkstra", "python'
        tags, _ = refine(text, stop_reason="max_tokens")
        self.assertEqual(tags, ["dijkstra", "redes sociais", "facebook"])

    def test_escaped_characters_inside_a_truncated_answer_are_decoded(self):
        text = '{"tags": ["a\\"b", "programa\\u00e7\\u00e3o", "corta'
        tags, _ = refine(text, stop_reason="max_tokens")
        self.assertEqual(tags, ['a"b', "programação"])

    def test_a_truncated_answer_without_any_complete_tag_reports_failure(self):
        tags, _ = refine('{"tags": ["dijks', stop_reason="max_tokens")
        self.assertIsNone(tags)

    def test_a_non_json_answer_reports_failure(self):
        tags, _ = refine("Desculpe, não consegui.")
        self.assertIsNone(tags)

    def test_an_error_from_bedrock_reports_failure(self):
        tags, _ = refine(error=RuntimeError("ThrottlingException"))
        self.assertIsNone(tags)

    def test_an_empty_tags_list_reports_failure(self):
        tags, _ = refine('{"tags": []}')
        self.assertIsNone(tags)

    def test_non_string_items_are_ignored(self):
        tags, _ = refine('{"tags": ["dijkstra", 3, null, "  ", "hash"]}')
        self.assertEqual(tags, ["dijkstra", "hash"])

    def test_no_candidates_means_no_call(self):
        bedrock = FakeBedrock('{"tags": ["dijkstra"]}')
        client = BedrockTagRefinerClient(bedrock, "model")
        self.assertEqual(client.refine([]), [])
        self.assertEqual(bedrock.requests, [])


class SuggestedTagsTests(unittest.TestCase):
    def test_a_tag_that_is_not_a_candidate_is_kept(self):
        tags, _ = refine('{"tags": ["dijkstra", "ordenação topológica", "hash"]}')
        self.assertEqual(tags, ["dijkstra", "ordenação topológica", "hash"])

    def test_the_tags_that_are_not_candidates_are_listed_in_the_log(self):
        bedrock = FakeBedrock('{"tags": ["dijkstra", "ordenação topológica", "árvores"]}')
        client = BedrockTagRefinerClient(bedrock, "model")
        with self.assertLogs("services.tag_refiner", level="INFO") as captured:
            client.refine(CANDIDATES)
        logged = chr(10).join(captured.output)
        self.assertIn("2 of 3 tag(s) are not in the candidates", logged)
        self.assertIn("ordenação topológica", logged)

    def test_nothing_is_logged_when_every_tag_is_a_candidate(self):
        bedrock = FakeBedrock('{"tags": ["dijkstra", "hash"]}')
        client = BedrockTagRefinerClient(bedrock, "model")
        with self.assertLogs("services.tag_refiner", level="INFO") as captured:
            client.refine(CANDIDATES)
        self.assertNotIn("not in the candidates", chr(10).join(captured.output))

    def test_the_same_tag_repeated_by_the_model_counts_once_even_with_other_case(self):
        tags, _ = refine('{"tags": ["árvores", "Árvores", " árvores "]}')
        self.assertEqual(tags, ["árvores"])


class PromptTests(unittest.TestCase):
    def prompt(self, candidates, context=None):
        return BedrockTagRefinerClient(FakeBedrock(), "model")._build_prompt(candidates, context or DocumentContext())

    def test_it_asks_to_select_normalize_and_suggest_concepts(self):
        prompt = self.prompt(["dijkstra", "hash"])
        self.assertIn("A tag is a key concept of the material", prompt)
        self.assertIn("Remove verbs", prompt)
        self.assertIn("Fix spelling", prompt)
        self.assertIn("You may add a concept when the candidates clearly point to it", prompt)
        self.assertTrue(prompt.rstrip().endswith('{"tags": ["...", "..."]}'))

    def test_every_candidate_is_listed_in_order_without_a_ranking_claim(self):
        prompt = self.prompt(["dijkstra", "hash", "grafo"])
        self.assertIn("CANDIDATES:\n- dijkstra\n- hash\n- grafo\n", prompt)
        self.assertNotIn("most important first", prompt)

    def test_the_language_of_the_document_is_named_in_the_prompt(self):
        self.assertIn(
            "Write every tag in Portuguese, the language of the document.",
            self.prompt(["hash"], DocumentContext(language="pt")),
        )
        self.assertIn(
            "Write every tag in German, the language of the document.",
            self.prompt(["hash"], DocumentContext(language="de")),
        )

    def test_without_a_known_language_the_tags_follow_the_candidates(self):
        for language in (None, "unknown", "xx"):
            prompt = self.prompt(["hash"], DocumentContext(language=language))
            self.assertIn("Write every tag in the same language as the candidates.", prompt)

    def test_the_file_name_is_in_the_prompt_before_the_candidates(self):
        context = DocumentContext(language="pt", filename="Entendendo Algoritmos.pdf")
        prompt = self.prompt(["hash"], context)
        self.assertIn("FILE NAME (it may hint at the title): Entendendo Algoritmos.pdf", prompt)
        self.assertLess(prompt.index("FILE NAME"), prompt.index("CANDIDATES:"))

    def test_the_context_section_is_left_out_when_there_is_no_filename(self):
        prompt = self.prompt(["hash"])
        self.assertNotIn("DOCUMENT CONTEXT", prompt)
        self.assertNotIn("FILE NAME", prompt)

    def test_the_prompt_never_mentions_excerpts(self):
        # Trechos do documento induziam o modelo a achar que o assunto era só o que eles cobriam
        # -- removidos, só o nome do arquivo dá uma pista do tema.
        prompt = self.prompt(["hash"], DocumentContext(language="pt", filename="livro.pdf"))
        self.assertNotIn("EXCERPT", prompt.upper())

    def test_the_examples_do_not_assume_a_field(self):
        instructions = self.prompt(["hash"]).lower().split("candidates:")[0]
        for term in ("algorithm", "algoritmo", "hash", "grafo", "graph", "dijkstra"):
            self.assertNotIn(term, instructions)

    def test_refine_sends_the_context_to_the_prompt(self):
        bedrock = FakeBedrock('{"tags": ["a"]}')
        client = BedrockTagRefinerClient(bedrock, "model")
        with silenced():
            client.refine(CANDIDATES, DocumentContext(language="pt", filename="livro.pdf"))
        sent = bedrock.requests[0]["messages"][0]["content"][0]["text"]
        self.assertIn("in Portuguese", sent)
        self.assertIn("livro.pdf", sent)

    def test_the_prompt_says_the_candidates_are_one_part_of_the_document(self):
        instructions = self.prompt(["hash"]).split("CANDIDATES:")[0]
        self.assertIn("ONE PART of it", instructions)

    def test_the_prompt_does_not_fix_a_number_of_tags(self):
        prompt = self.prompt([f"c{index}" for index in range(300)])
        instructions = prompt.split("CANDIDATES:")[0].lower()
        self.assertIn("as many tags as this part really has", instructions)
        self.assertNotRegex(instructions, r"\b(top|exactly|at most|up to|between)\b")
        self.assertNotRegex(instructions, r"\d+\s+(tags|keywords|concepts)")

    def test_the_prompt_is_logged_in_full_with_the_candidates(self):
        bedrock = FakeBedrock('{"tags": ["dijkstra"]}')
        client = BedrockTagRefinerClient(bedrock, "model")
        with self.assertLogs("services.tag_refiner", level="INFO") as captured:
            client.refine(["dijkstra", "hash"])
        logged = "\n".join(captured.output)
        self.assertIn("Tag refiner prompt sent to model", logged)
        self.assertIn("- dijkstra", logged)
        self.assertIn("CANDIDATES:", logged)

    def test_the_request_sends_exactly_the_prompt(self):
        bedrock = FakeBedrock('{"tags": ["a"]}')
        client = BedrockTagRefinerClient(bedrock, "model")
        with silenced():
            client.refine(CANDIDATES)
        self.assertEqual(
            bedrock.requests[0]["messages"][0]["content"][0]["text"],
            client._build_prompt(CANDIDATES, DocumentContext()),
        )


class RecordingClient:
    """Devolve, a cada chamada, o próximo item de `answers` (None simula uma faixa que falhou)."""

    def __init__(self, answers):
        self.answers = list(answers)
        self.bands_received: list[list[str]] = []

    def refine(self, candidates, context=None):
        self.bands_received.append(list(candidates))
        return self.answers.pop(0) if self.answers else None


class TagRefinerServiceTests(unittest.TestCase):
    def test_it_calls_the_client_once_per_band_and_joins_the_answers(self):
        client = RecordingClient([["dijkstra"], ["tabela hash"], ["grafos"]])
        service = TagRefinerService(TagRefinerData(), client)

        with silenced():
            tags = service.refine([["a", "b"], ["c"], ["d", "e"]])

        self.assertEqual(tags, ["dijkstra", "tabela hash", "grafos"])
        self.assertEqual(client.bands_received, [["a", "b"], ["c"], ["d", "e"]])

    def test_the_same_tag_in_two_bands_is_kept_once(self):
        client = RecordingClient([["hash", "grafos"], ["Hash", " grafos ", "árvores"]])
        service = TagRefinerService(TagRefinerData(), client)

        with silenced():
            tags = service.refine([["a"], ["b"]])

        self.assertEqual(tags, ["hash", "grafos", "árvores"])

    def test_a_band_that_fails_is_skipped_and_the_others_still_count(self):
        client = RecordingClient([["hash"], None, ["grafos"]])
        service = TagRefinerService(TagRefinerData(), client)

        with silenced():
            tags = service.refine([["a"], ["b"], ["c"]])

        self.assertEqual(tags, ["hash", "grafos"])

    def test_only_when_every_band_fails_the_document_falls_back_to_the_candidates(self):
        client = RecordingClient([None, None])
        service = TagRefinerService(TagRefinerData(), client)

        with silenced():
            tags = service.refine([["a", "b"], ["c"]])

        self.assertEqual(tags, ["a", "b", "c"])

    def test_empty_bands_are_not_sent_to_the_client(self):
        client = RecordingClient([["hash"]])
        service = TagRefinerService(TagRefinerData(), client)

        with silenced():
            service.refine([[], ["a"], []])

        self.assertEqual(client.bands_received, [["a"]])

    def test_the_service_caps_the_refined_tags_at_max_tags(self):
        client = RecordingClient([[f"t{index}" for index in range(20)]])
        service = TagRefinerService(TagRefinerData(enabled=True, max_tags=5), client)

        with silenced():
            self.assertEqual(service.refine([["a"]]), [f"t{index}" for index in range(5)])

    def test_the_fallback_is_capped_at_max_tags_too(self):
        service = TagRefinerService(TagRefinerData(enabled=True, max_tags=2), RecordingClient([None]))

        with silenced():
            self.assertEqual(service.refine([["a", "b", "c", "d"]]), ["a", "b"])

    def test_the_default_cap_is_200(self):
        self.assertEqual(TagRefinerData().max_tags, 200)

    def test_the_context_reaches_the_client(self):
        received = {}

        class ContextClient:
            def refine(self, candidates, context=None):
                received["context"] = context
                return ["a"]

        context = DocumentContext(language="en")
        with silenced():
            TagRefinerService(TagRefinerData(), ContextClient()).refine([["x"]], context)
        self.assertIs(received["context"], context)

    def test_a_disabled_refiner_returns_the_candidates_untouched(self):
        client = RecordingClient([["dijkstra"]])
        service = TagRefinerService(TagRefinerData(enabled=False), client)

        self.assertEqual(service.refine([["a", "b"], ["c"]]), ["a", "b", "c"])
        self.assertEqual(client.bands_received, [])

    def test_no_candidates_at_all_means_no_call(self):
        client = RecordingClient([["dijkstra"]])
        service = TagRefinerService(TagRefinerData(), client)

        self.assertEqual(service.refine([]), [])
        self.assertEqual(service.refine([[], []]), [])
        self.assertEqual(client.bands_received, [])


if __name__ == "__main__":
    unittest.main()

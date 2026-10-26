import pathlib
import sys
import types
import unittest

# Carrega só services/utils, services/chunk e services/vector: o __init__.py do pacote
# importa pypdf, yake etc., que não são necessários para testar a geração de ids.
_SERVICES_DIR = pathlib.Path(__file__).resolve().parents[1] / "services"
if "services" not in sys.modules:
    _package = types.ModuleType("services")
    _package.__path__ = [str(_SERVICES_DIR)]
    sys.modules["services"] = _package

from services.chunk import Chunk  # noqa: E402
from services.utils import build_vector_id  # noqa: E402
from services.vector import (  # noqa: E402
    VectorMetadata,
    VectorObject,
    VectorService,
    VectorServiceData,
)


class BuildVectorIdTest(unittest.TestCase):
    def test_format(self):
        self.assertEqual(build_vector_id("obj_abc", 14, 0), "vec_obj_abc_14_0")

    def test_is_deterministic(self):
        self.assertEqual(build_vector_id("obj_abc", 3, 7), build_vector_id("obj_abc", 3, 7))

    def test_distinct_positions_give_distinct_ids(self):
        ids = {build_vector_id("obj_abc", page, index) for page in range(1, 4) for index in range(5)}
        self.assertEqual(len(ids), 15)

    def test_distinct_objects_give_distinct_ids(self):
        self.assertNotEqual(build_vector_id("obj_a", 1, 0), build_vector_id("obj_b", 1, 0))

    def test_rejects_empty_object_id(self):
        with self.assertRaises(ValueError):
            build_vector_id("", 1, 0)

    def test_rejects_invalid_position(self):
        with self.assertRaises(ValueError):
            build_vector_id("obj_abc", 0, 0)
        with self.assertRaises(ValueError):
            build_vector_id("obj_abc", 1, -1)


class FakeVectorClient:
    def __init__(self, fail_on_put_call: int | None = None):
        self.calls = []
        self.delete_calls = []
        self.fail_on_put_call = fail_on_put_call

    def put_vectors(self, **kwargs):
        if self.fail_on_put_call is not None and len(self.calls) + 1 == self.fail_on_put_call:
            raise RuntimeError("put_vectors failed")
        self.calls.append(kwargs)

    def delete_vectors(self, **kwargs):
        self.delete_calls.append(kwargs)


def _vector_object(page: int, chunk_index: int, embedding=None) -> VectorObject:
    return VectorObject(
        chunk=Chunk(index=chunk_index, text="texto"),
        embedding=[0.1, 0.2] if embedding is None else embedding,
        metadata=VectorMetadata(
            user="user-1",
            object_key="tenants/user-1/context/x/doc.pdf",
            page=page,
            chunk_index=chunk_index,
            language="pt",
            chunk="texto",
        ),
    )


class VectorServiceSaveTest(unittest.TestCase):
    def setUp(self):
        self.client = FakeVectorClient()
        self.service = VectorService(
            VectorServiceData(
                vector_client=self.client,
                vector_bucket_name="bucket",
                vector_index_arn="arn:index",
            )
        )

    def test_sends_deterministic_ids_and_returns_them(self):
        result = self.service.save([_vector_object(1, 0), _vector_object(2, 3)], object_id="obj_abc")

        expected = ["vec_obj_abc_1_0", "vec_obj_abc_2_3"]
        self.assertEqual(result.vector_ids, expected)
        self.assertEqual([vector["key"] for vector in self.client.calls[0]["vectors"]], expected)

    def test_saving_the_same_content_twice_gives_the_same_ids(self):
        first = self.service.save([_vector_object(1, 0)], object_id="obj_abc")
        second = self.service.save([_vector_object(1, 0)], object_id="obj_abc")

        self.assertEqual(first.vector_ids, second.vector_ids)

    def test_rejects_duplicate_position_in_the_same_batch(self):
        with self.assertRaises(ValueError):
            self.service.save([_vector_object(1, 0), _vector_object(1, 0)], object_id="obj_abc")
        self.assertEqual(self.client.calls, [])

    def test_rejects_empty_embedding(self):
        with self.assertRaises(ValueError):
            self.service.save([_vector_object(1, 0, embedding=[])], object_id="obj_abc")

    def test_rejects_empty_objects_list(self):
        with self.assertRaises(ValueError):
            self.service.save([], object_id="obj_abc")


class VectorServiceBatchingTest(unittest.TestCase):
    def _service(self, client):
        return VectorService(
            VectorServiceData(vector_client=client, vector_bucket_name="bucket", vector_index_arn="arn:index")
        )

    def _objects(self, count):
        return [_vector_object(1, index) for index in range(count)]

    def test_save_splits_into_batches_of_500(self):
        client = FakeVectorClient()

        result = self._service(client).save(self._objects(1201), object_id="obj_abc")

        self.assertEqual([len(call["vectors"]) for call in client.calls], [500, 500, 201])
        self.assertEqual(len(result.vector_ids), 1201)

    def test_save_boundaries(self):
        for count, expected in [(1, [1]), (500, [500]), (501, [500, 1])]:
            client = FakeVectorClient()
            self._service(client).save(self._objects(count), object_id="obj_abc")
            self.assertEqual([len(call["vectors"]) for call in client.calls], expected)

    def test_failure_on_a_later_batch_deletes_the_vectors_already_stored(self):
        client = FakeVectorClient(fail_on_put_call=2)

        with self.assertRaises(RuntimeError):
            self._service(client).save(self._objects(700), object_id="obj_abc")

        first_batch_keys = [vector["key"] for vector in client.calls[0]["vectors"]]
        self.assertEqual(len(client.calls), 1)
        self.assertEqual([call["keys"] for call in client.delete_calls], [first_batch_keys])

    def test_failure_on_the_first_batch_has_nothing_to_clean_up(self):
        client = FakeVectorClient(fail_on_put_call=1)

        with self.assertRaises(RuntimeError):
            self._service(client).save(self._objects(700), object_id="obj_abc")

        self.assertEqual(client.delete_calls, [])

    def test_delete_splits_into_batches_of_500(self):
        client = FakeVectorClient()

        self._service(client).delete([f"vec_{index}" for index in range(1201)])

        self.assertEqual([len(call["keys"]) for call in client.delete_calls], [500, 500, 201])

    def test_delete_with_no_ids_does_not_call_the_client(self):
        client = FakeVectorClient()

        self._service(client).delete([])

        self.assertEqual(client.delete_calls, [])


if __name__ == "__main__":
    unittest.main()

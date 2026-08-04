# processor (local clone)

Local, AWS-free clone of `api/processor`, created to experiment with the
ingestion pipeline's chunking, tagging and file-type handling without needing
S3, Bedrock, S3 Vectors or DynamoDB. Reads files from a local folder, writes
JSON to a local folder. This is a throwaway/experimentation app, not meant to
ship — once you've validated an improvement here, port it back into
`api/processor`.

## How it maps to `api/processor`

| `api/processor` (AWS)               | `processor` (local)                          |
|--------------------------------------|-----------------------------------------------|
| `services/s3.py` (S3Service)         | `services/storage.py` (StorageService, langchain_community loaders) |
| `services/embedding.py` (Bedrock)    | `services/embedding.py` (local hashing stub)  |
| `services/vector.py` (S3 Vectors)    | `services/vector_store.py` (JSON file)        |
| `services/dynamo.py` (DynamoDB)      | `services/metadata_store.py` (JSON file)      |
| `services/chunk.py`                  | extended: recursive / markdown / token strategy |
| `services/tag.py`                    | identical (reused as-is), now traced          |
| —                                     | `services/tag_refiner.py` (new — see below)   |
| S3 event records                     | list of local file paths                      |

`StorageService` additionally reads `.docx`, `.csv` and `.json` (the original
only handles `.txt`, `.md`, `.pdf`) as a starting point for exploring more
file-extension coverage.

## Input layout

```
processor/input/<user_id>/<filename>.<ext>
```

`<user_id>` is taken from the first path segment (this is a simplified stand-in
for the production S3 key convention `uploads/<user_id>/<filename>`, since
there's no bucket prefix locally).

## Setup

```powershell
cd processor
py -m venv venv
venv\Scripts\pip install -r requirements.txt
```

## Run

```powershell
venv\Scripts\python main.py
# or explicit dirs / chunk strategy:
venv\Scripts\python main.py --input-dir input --output-dir output --chunk-strategy markdown
```

Env vars (all optional, same defaults as the CLI flags):
`INPUT_DIR`, `OUTPUT_DIR`, `MODEL_ID`, `EMBEDDING_DIMENSIONS`, `CHUNK_SIZE`,
`CHUNK_OVERLAP`, `CHUNK_STRATEGY`, `MAX_FILE_SIZE_MB`, `TAG_REFINER_ENABLED`,
`TAG_REFINER_MAX_TAGS`.

## Output

- `output/vectors.json` — every chunk's embedding + metadata (mirrors what
  would be `put_vectors` into S3 Vectors).
- `output/objects.json` — one record per processed document (mirrors what
  would be `put_item` into DynamoDB).
- `output/reports/<user_id>__<filename>.json` — **local-only addition**, not
  present in the AWS version. Per-page breakdown of language, YAKE tags vs.
  refined tags, and every chunk's full text/length/headers, without
  embedding vectors cluttering the file. This is the file to read when
  judging chunk boundaries and tag quality.

## Implemented improvements

### 1. Document loaders (`langchain_community.document_loaders`)

`storage.py` now delegates extraction to `TextLoader` (txt/md), `PyPDFLoader`
(pdf, one `Document` per page already), `Docx2txtLoader` (docx) and
`CSVLoader` (csv, rows re-joined into one page to keep the original
single-page-per-file behaviour). JSON keeps a hand-rolled reader —
LangChain's `JSONLoader` needs the `jq` Python binding, a C-extension wheel
that's awkward on Windows and not worth it for a format this simple to read
with the stdlib.

### 2. Structure-aware chunking (`services/chunk.py`)

`ChunkService` now takes a `strategy`:
- `"recursive"` (default) — unchanged, identical to `api/processor`.
- `"markdown"` — for `.md` files, splits on headers first via
  `MarkdownHeaderTextSplitter`, then runs the recursive splitter *inside*
  each section so `chunk_size` is still respected. Every chunk carries its
  section headers (see `chunk.headers` / `VectorMetadata.headers`), visible
  in `output/reports/*.json`. Non-`.md` files fall back to `"recursive"`.
  Verified locally: `notes.md`'s three `##` sections now produce exactly
  three chunks, each tagged with `{"Header 1": ..., "Header 2": ...}`,
  instead of arbitrary 1000-character slices.
- `"token"` — uses `TokenTextSplitter` (tiktoken, `cl100k_base`) so
  `chunk_size` counts tokens, not characters. This **does** work fully
  locally after the first run — tiktoken fetches the encoding file once over
  the network and caches it; no further internet is needed. Verified
  working in this environment.
- `SemanticChunker` (embedding-distance-based splitting) was considered and
  **intentionally left out** — too costly (needs an embedding call per
  sentence) for what this is being used for right now.

Switch strategies with `--chunk-strategy {recursive,markdown,token}` or
`CHUNK_STRATEGY` and compare the resulting `reports/*.json` side by side.

### 3. YAKE + LLM tag refinement (`services/tag_refiner.py`) — simulated, not real yet

New `TagRefinerService` sits between YAKE and the final tag list:
`yake tags -> TagRefinerService.refine() -> final tags`. Locally it's wired
to `SimulatedLLMTagRefinerClient`, a heuristic (no network, no API key) that
drops obvious sentence-fragment candidates — **just enough to keep the
pipeline shape (call the refiner, get a cleaned list back) exercised**, not
a real quality bar. `output/reports/*.json` records both `tags_yake` and
`tags_refined` per page so you can compare them.

This is intentionally a placeholder: when you're ready to wire this into the
real `api/processor`, implement a `BedrockTagRefinerClient` that satisfies
the same `TagRefinerClient.refine(candidates, text) -> list[str]` protocol
and calls `bedrock_runtime_client.converse(...)` — the TODO block with a
suggested prompt is already written in `services/tag_refiner.py`. No other
code changes needed; it plugs into the same constructor argument used here
(`TagRefinerService(config, client=BedrockTagRefinerClient(...))`).

Toggle with `TAG_REFINER_ENABLED` (default `true` locally) and
`TAG_REFINER_MAX_TAGS`.

### 7. LangSmith tracing

`TagService.get_tags`, `EmbeddingService.generate_embedding`,
`TagRefinerService.refine` and `ProcessorHandler._handle_create_event` are
decorated with `@traceable` from the `langsmith` SDK. This is a safe no-op
by default — with no `LANGSMITH_API_KEY` set, nothing is sent anywhere and
nothing breaks (confirmed: all three chunk strategies ran clean with no
tracing configured).

To actually see traces, set before running:

```powershell
$env:LANGSMITH_TRACING = "true"
$env:LANGSMITH_API_KEY = "<your key from smith.langchain.com>"
venv\Scripts\python main.py
```

Traces land under the `floslo-processor-local` project (set via
`LANGSMITH_PROJECT`, defaulted in `config.py`) and give you a document-by-
document timeline of tag extraction, refinement and embedding calls —
faster to compare across parameter changes than reading `reports/*.json` by
hand.

## Deferred (by explicit decision — not implemented)

- **Real local embeddings** (`HuggingFaceEmbeddings` / sentence-transformers)
  — the hash-based stub in `services/embedding.py` stays. Current goal is
  chunking/tagging only; revisit if/when embedding quality itself needs
  testing.
- **Real local vector store** (FAISS/Chroma) — `vector_store.py` stays a
  flat JSON file. Not needed without real embeddings behind it.
- **LCEL pipeline** (`RunnableSequence`) — `ProcessorHandler` stays
  imperative. Revisit only if the pipeline grows enough steps that manual
  wiring becomes painful.

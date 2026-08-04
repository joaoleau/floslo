import os
from pathlib import Path


class Config:
    """Local, AWS-free counterpart of api/processor/config/config.py.

    Everything that used to be an AWS client/resource is now a local path
    or a plain parameter, so the pipeline can run entirely offline.
    """

    def __init__(self):
        base_dir = Path(__file__).resolve().parent.parent

        self.input_dir = Path(os.getenv("INPUT_DIR", base_dir / "input"))
        self.output_dir = Path(os.getenv("OUTPUT_DIR", base_dir / "output"))

        self.model_id = os.getenv("MODEL_ID", "local-hashing-embedding-v1")
        self.embedding_dimensions = int(os.getenv("EMBEDDING_DIMENSIONS", "256"))

        self.chunk_size = int(os.getenv("CHUNK_SIZE", "1000"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "200"))
        # "recursive" (default, char-based) | "markdown" (.md header-aware) | "token" (tiktoken)
        self.chunk_strategy = os.getenv("CHUNK_STRATEGY", "recursive")

        self.tag_refiner_enabled = os.getenv("TAG_REFINER_ENABLED", "true").lower() in ("1", "true", "yes")
        self.tag_refiner_max_tags = int(os.getenv("TAG_REFINER_MAX_TAGS", "7"))

        self.max_file_size_mb = int(os.getenv("MAX_FILE_SIZE_MB", "50"))

        self.vectors_output_path = self.output_dir / "vectors.json"
        self.objects_output_path = self.output_dir / "objects.json"
        self.reports_dir = self.output_dir / "reports"

        # LangSmith tracing is a no-op unless LANGSMITH_TRACING=true and
        # LANGSMITH_API_KEY are set -- this just groups traces under a
        # sensible default project name when tracing is turned on.
        os.environ.setdefault("LANGSMITH_PROJECT", "floslo-processor-local")

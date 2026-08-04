import argparse
import logging
import sys
from pathlib import Path

from config import Config
from handlers import ProcessorHandler, HandlerData
from services import (
    StorageService, StorageServiceData,
    TagService, TagServiceData,
    TagRefinerService, TagRefinerData, SimulatedLLMTagRefinerClient,
    EmbeddingService, EmbeddingServiceData,
    VectorStore, VectorStoreData,
    ChunkService, ChunkServiceData,
    MetadataStore, MetadataStoreData
)

SUPPORTED_EXTENSIONS = {"txt", "md", "pdf", "docx", "csv", "json"}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
logger = logging.getLogger("local_processor")


def discover_keys(input_dir: Path) -> list[str]:
    keys = []
    for path in sorted(input_dir.rglob("*")):
        if not path.is_file():
            continue

        ext = path.suffix.lower().lstrip(".")
        if ext not in SUPPORTED_EXTENSIONS:
            logger.debug(f"Skipping unsupported file: {path}")
            continue

        keys.append(path.relative_to(input_dir).as_posix())

    return keys


def build_handler(cfg: Config) -> ProcessorHandler:
    storage_service = StorageService(
        StorageServiceData(root_dir=cfg.input_dir, max_file_size_mb=cfg.max_file_size_mb)
    )
    tag_service = TagService(TagServiceData())
    tag_refiner = TagRefinerService(
        TagRefinerData(enabled=cfg.tag_refiner_enabled, max_tags=cfg.tag_refiner_max_tags),
        client=SimulatedLLMTagRefinerClient()
    )
    embedding_service = EmbeddingService(
        EmbeddingServiceData(model_id=cfg.model_id, dimensions=cfg.embedding_dimensions)
    )
    vector_store = VectorStore(VectorStoreData(output_path=cfg.vectors_output_path))
    chunk_service = ChunkService(
        ChunkServiceData(
            chunk_size=cfg.chunk_size,
            chunk_overlap=cfg.chunk_overlap,
            strategy=cfg.chunk_strategy
        )
    )
    metadata_store = MetadataStore(MetadataStoreData(output_path=cfg.objects_output_path))

    return ProcessorHandler(HandlerData(
        storage_service=storage_service,
        tag_service=tag_service,
        tag_refiner=tag_refiner,
        embedding_service=embedding_service,
        vector_store=vector_store,
        chunk_service=chunk_service,
        metadata_store=metadata_store,
        reports_dir=cfg.reports_dir
    ))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Local, AWS-free clone of api/processor -- reads files from disk, writes JSON to disk."
    )
    parser.add_argument("--input-dir", type=Path, default=None, help="Overrides INPUT_DIR env var")
    parser.add_argument("--output-dir", type=Path, default=None, help="Overrides OUTPUT_DIR env var")
    parser.add_argument(
        "--chunk-strategy", choices=["recursive", "markdown", "token"], default=None,
        help="Overrides CHUNK_STRATEGY env var"
    )
    args = parser.parse_args()

    cfg = Config()
    if args.input_dir:
        cfg.input_dir = args.input_dir
    if args.output_dir:
        cfg.output_dir = args.output_dir
        cfg.vectors_output_path = cfg.output_dir / "vectors.json"
        cfg.objects_output_path = cfg.output_dir / "objects.json"
        cfg.reports_dir = cfg.output_dir / "reports"
    if args.chunk_strategy:
        cfg.chunk_strategy = args.chunk_strategy

    if not cfg.input_dir.exists():
        logger.error(f"Input directory does not exist: {cfg.input_dir}")
        return 1

    keys = discover_keys(cfg.input_dir)
    logger.info(
        f"Discovered {len(keys)} file(s) under '{cfg.input_dir}'. "
        f"Expected layout: <user_id>/<filename>.<ext> | chunk_strategy={cfg.chunk_strategy}"
    )

    if not keys:
        logger.warning("No supported files found. Nothing to do.")
        return 0

    handler = build_handler(cfg)
    handler.process_all(keys)

    logger.info(
        f"Done. Vectors -> {cfg.vectors_output_path} | "
        f"Objects -> {cfg.objects_output_path} | "
        f"Reports -> {cfg.reports_dir}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

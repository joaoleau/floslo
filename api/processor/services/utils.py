import logging
import uuid

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def normalize_text(text: str) -> str:   
    text = text.replace("\x00", "")
    text = text.strip()
        
    return text

def build_id_with_prefix(prefix: str) -> str:
    return f"{prefix}_{str(uuid.uuid4())}"
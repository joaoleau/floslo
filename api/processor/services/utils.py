import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

def normalize_text(text: str) -> str:   
    text = text.replace("\x00", "")
    text = text.strip()
        
    return text
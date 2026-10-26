import logging
import uuid
from urllib.parse import unquote_plus

logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:   
    text = text.replace("\x00", "")
    text = text.strip()
        
    return text

def build_id_with_prefix(prefix: str) -> str:
    return f"{prefix}_{str(uuid.uuid4())}"

def build_vector_id(object_id: str, page: int, chunk_index: int) -> str:
    # Id determinístico: o mesmo chunk gera sempre o mesmo id, então a memória de
    # repetição espaçada (chave no item MEM# do backend) continua valendo se o índice
    # de vetores for reconstruído. (page, chunk_index) é único por objeto: cada leitor
    # em s3.py emite uma página por vez e o índice reinicia a cada página.
    if not object_id:
        raise ValueError("object_id cannot be empty.")
    if page < 1 or chunk_index < 0:
        raise ValueError(f"Invalid chunk position page={page} chunk_index={chunk_index}.")

    return f"vec_{object_id}_{page}_{chunk_index}"

def decode_s3_key(key: str) -> str:
    # O evento do S3 entrega a chave codificada como URL: espaço vira "+" e acentos e
    # símbolos viram %XX. Sem decodificar, get_object procura uma chave que não existe.
    return unquote_plus(key)

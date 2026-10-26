import logging
import re
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
    # Id determinístico: o mesmo chunk gera sempre o mesmo id, então a floslo-rag acha os
    # vizinhos de um chunk pela chave (o anterior e o seguinte na mesma página), e o id
    # continua o mesmo se o índice de vetores for reconstruído. (page, chunk_index) é único
    # por objeto: cada leitor em s3.py emite uma página por vez e o índice reinicia a cada
    # página.
    if not object_id:
        raise ValueError("object_id cannot be empty.")
    if page < 1 or chunk_index < 0:
        raise ValueError(f"Invalid chunk position page={page} chunk_index={chunk_index}.")

    return f"vec_{object_id}_{page}_{chunk_index}"

def _words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())

def contains_words(longer: str, shorter: str) -> bool:
    # Diz se as palavras de `shorter` aparecem, em sequência, entre as palavras de `longer`.
    # Compara palavras inteiras, e não pedaços de texto: "rede" está em "rede neural", mas
    # não em "parede", e "arte" não está em "parte do sistema".
    long_words, short_words = _words(longer), _words(shorter)
    if not short_words or len(short_words) > len(long_words):
        return False
    size = len(short_words)
    return any(long_words[i:i + size] == short_words for i in range(len(long_words) - size + 1))

def remove_redundant_keywords(keywords: list[tuple[str, float]]) -> list[tuple[str, float]]:
    # Entre uma candidata e outra mais longa que a contém ("rede" e "rede neural"), fica só a
    # mais específica. As mais longas são aceitas primeiro.
    final: list[tuple[str, float]] = []
    for keyword, score in sorted(keywords, key=lambda item: len(item[0]), reverse=True):
        if any(contains_words(existing, keyword) for existing, _ in final):
            logger.debug(f"Skipping redundant keyword: '{keyword}'")
            continue
        final.append((keyword, score))
    return final

def decode_s3_key(key: str) -> str:
    # O evento do S3 entrega a chave codificada como URL: espaço vira "+" e acentos e
    # símbolos viram %XX. Sem decodificar, get_object procura uma chave que não existe.
    return unquote_plus(key)

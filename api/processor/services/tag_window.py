class TagWindowBuffer:
    """Junta o texto de páginas seguidas até acumular pelo menos `window_chars` caracteres,
    pra extração de tags rodar sobre um trecho maior em vez de uma página isolada.

    Uma página sozinha às vezes tem pouco texto (título de capítulo, página quase em branco), e
    isso dá poucos candidatos e um contexto fraco pro YAKE. Juntando páginas numa janela maior, o
    YAKE tem mais exemplos do mesmo termo pra reconhecer um conceito recorrente.

    `add` devolve o texto da janela assim que ela atinge o tamanho mínimo (nunca corta no meio de
    uma página) e reinicia o acúmulo; `flush` devolve o que sobrou no fim do documento.
    """

    def __init__(self, window_chars: int) -> None:
        if window_chars <= 0:
            raise ValueError(f"window_chars must be positive, got {window_chars}.")
        self._window_chars = window_chars
        self._parts: list[str] = []
        self._length = 0

    def add(self, text: str) -> str | None:
        self._parts.append(text)
        self._length += len(text)
        if self._length >= self._window_chars:
            return self._take()
        return None

    def flush(self) -> str | None:
        return self._take() if self._parts else None

    def _take(self) -> str:
        window_text = "\n".join(self._parts)
        self._parts = []
        self._length = 0
        return window_text

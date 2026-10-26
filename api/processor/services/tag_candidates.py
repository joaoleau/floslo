from collections import Counter
from typing import Iterable, Protocol

# Em quantas faixas o documento é dividido. Com 10 faixas, um livro de 350 páginas tem cerca de
# 35 páginas por faixa.
DEFAULT_BANDS = 10


class TaggedValue(Protocol):
    value: str


class TagCandidates:
    """Junta as tags do YAKE de todas as páginas do documento, sem repetição, e guarda o idioma
    de cada página.

    As páginas são divididas em faixas, e cada candidata pertence à faixa da página (ou janela)
    em que apareceu pela primeira vez. Isso serve a dois usos: `bands` refina uma faixa por vez,
    e `values` devolve a lista intercalada entre as faixas, para um corte por quantidade tirar de
    todas as partes do documento em vez de só do fim.

    O score do YAKE não entra na ordem de propósito: ele favorece picos raros (nomes de
    personagens, trechos de código, pedaços de frase), então ordenar por ele poria o ruído no topo
    de cada faixa. Dentro de cada faixa vale a ordem do documento.
    """

    def __init__(self, bands: int = DEFAULT_BANDS) -> None:
        self._bands = max(1, bands)
        self._pages = 0
        self._first_page: dict[str, int] = {}
        self._languages: Counter[str] = Counter()

    def add_page(self, tags: Iterable[TaggedValue], language: str | None = None) -> None:
        if language and language != "unknown":
            self._languages[language] += 1

        page = self._pages
        self._pages += 1

        for tag in tags:
            self._first_page.setdefault(tag.value, page)

    def bands(self, total_limit: int | None = None) -> list[list[str]]:
        """As candidatas agrupadas por faixa do documento; faixa sem candidata não aparece.
        `total_limit` é o teto somando todas as faixas, dividido igualmente entre elas."""
        groups = [group for group in self._grouped() if group]
        if total_limit is None or not groups:
            return groups

        per_band = max(1, total_limit // len(groups))
        return [group[:per_band] for group in groups]

    def values(self, limit: int | None = None) -> list[str]:
        """Todas as candidatas numa lista só, alternando entre as faixas: uma da primeira faixa,
        uma da segunda, e assim por diante."""
        ordered = self._interleaved()
        return ordered if limit is None else ordered[:limit]

    def dominant_language(self) -> str | None:
        """O idioma da maioria das páginas, ou None se nenhuma página teve idioma detectado."""
        if not self._languages:
            return None
        return self._languages.most_common(1)[0][0]

    def _grouped(self) -> list[list[str]]:
        if not self._first_page:
            return []

        bands = min(self._bands, self._pages)
        groups: list[list[str]] = [[] for _ in range(bands)]
        for value, page in self._first_page.items():
            groups[page * bands // self._pages].append(value)
        return groups

    def _interleaved(self) -> list[str]:
        groups = self._grouped()
        if not groups:
            return []

        ordered: list[str] = []
        for round_number in range(max(len(group) for group in groups)):
            for group in groups:
                if round_number < len(group):
                    ordered.append(group[round_number])
        return ordered

    def __len__(self) -> int:
        return len(self._first_page)

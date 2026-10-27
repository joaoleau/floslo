/**
 * Cópia embaralhada da lista (Fisher-Yates). `random` existe para os testes fixarem a ordem.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

// Letra de cada alternativa pela posição em que aparece: A, B, C, D...
export function alternativeLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

import { todayLocalDate } from './localDate';

// A sequência que o app mostra. O backend só recalcula current_streak quando chega um novo dia
// de estudo, então depois de mais de um dia sem estudar ele ainda guarda o valor antigo. Se o
// último dia de estudo for anterior a ontem (no fuso do aparelho), a sequência já foi quebrada
// e o app mostra 0.
export function displayedStreak(
  currentStreak: number,
  lastActiveDate: string | null,
  now: Date = new Date()
): number {
  if (!lastActiveDate) return currentStreak;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return lastActiveDate >= todayLocalDate(yesterday) ? currentStreak : 0;
}

import { todayLocalDate } from './localDate';

export function displayedStreak(
  currentStreak: number,
  lastActiveDate: string | null,
  now: Date = new Date()
): number {
  if (!lastActiveDate) return currentStreak;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return lastActiveDate >= todayLocalDate(yesterday) ? currentStreak : 0;
}

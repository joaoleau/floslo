import { Ionicons } from '@expo/vector-icons';
import { QuizDifficulty } from '@/types/domain/Scheduler';

export const DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

export const DIFFICULTY_META: Record<
  QuizDifficulty,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string; border: string }
> = {
  easy: { icon: 'leaf', color: '#16a34a', bg: 'bg-green-500/10', border: 'border-green-500' },
  medium: { icon: 'flame', color: '#d97706', bg: 'bg-amber-500/10', border: 'border-amber-500' },
  hard: { icon: 'flash', color: '#dc2626', bg: 'bg-red-500/10', border: 'border-red-500' },
};

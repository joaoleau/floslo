import { Ionicons } from '@expo/vector-icons';
import { ChallengeType } from '@/types/domain/History';

// Mesma paleta usada nas badges de SchedulerCard.tsx, pra manter a associação visual
// tipo-de-desafio -> cor consistente em todo o app.
export const CHALLENGE_TYPE_META: Record<
  ChallengeType,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }
> = {
  QUIZ: { icon: 'school-outline', color: '#2563eb', label: 'Quiz' },
  FLASHCARD: { icon: 'albums-outline', color: '#7c3aed', label: 'Flashcard' },
  TRUE_FALSE: { icon: 'checkmark-done-outline', color: '#0d9488', label: 'Verdadeiro ou Falso' },
};

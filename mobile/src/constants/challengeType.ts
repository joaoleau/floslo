import { Ionicons } from '@expo/vector-icons';
import { ChallengeType } from '@/types/domain/History';

// Mesma paleta usada nas badges de histórico/estatísticas, pra manter a associação
// visual tipo-de-desafio -> cor consistente em todo o app. Tons
// "joia" (mais escuros/profundos) de propósito -- se diferenciam da paleta vibrante dos
// cards (hashColor.ts) pela saturação/luminosidade, não só pelo matiz, já que só existem
// 3 tipos de desafio contra 8 cores de card (evitar sobreposição de matiz seria
// praticamente impossível).
export const CHALLENGE_TYPE_META: Record<
  ChallengeType,
  { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; label: string }
> = {
  QUIZ: { icon: 'school-outline', color: '#208fe9', label: 'Quiz' },
  FLASHCARD: { icon: 'albums-outline', color: '#f8c73f', label: 'Flashcard' },
  TRUE_FALSE: { icon: 'checkmark-done-outline', color: '#c23232', label: 'Verdadeiro ou Falso' },
};

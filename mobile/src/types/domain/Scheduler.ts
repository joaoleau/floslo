import { SupportedLanguage } from '@/types/api/SchedulerDTO';

export interface Sound {
  name: string;
}

export type { SupportedLanguage };

export const SUPPORTED_LANGUAGES: { value: SupportedLanguage; label: string; flag: string }[] = [
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'en', label: 'Inglês', flag: '🇺🇸' },
  { value: 'es', label: 'Espanhol', flag: '🇪🇸' },
  { value: 'fr', label: 'Francês', flag: '🇫🇷' },
  { value: 'de', label: 'Alemão', flag: '🇩🇪' },
  { value: 'it', label: 'Italiano', flag: '🇮🇹' },
];

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((option) => [option.value, option.flag]),
) as Record<SupportedLanguage, string>;

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizChallenge {
  questionCount: number;
  difficulty: QuizDifficulty;
}

export interface FlashcardChallenge {
  cardCount: number;
}

export interface TrueFalseChallenge {
  questionCount: number;
  difficulty: QuizDifficulty;
}

export type Challenger =
  | { challengeType: 'QUIZ'; language: SupportedLanguage; challenge: QuizChallenge }
  | { challengeType: 'FLASHCARD'; language: SupportedLanguage; challenge: FlashcardChallenge }
  | { challengeType: 'TRUE_FALSE'; language: SupportedLanguage; challenge: TrueFalseChallenge };

export interface Scheduler {
  id: string;
  name: string;
  weekDays: string[];
  startTime: string;
  alarmSound: string;
  objectIds: string[];
  challengers: Challenger[];
  enabled: boolean;
  vibration: boolean;
  soundEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// src/types/api/SchedulerDTO.ts

// Keep this set in sync with api/internal/model/scheduler.go's Language enum and
// api/processor/services/tag.py's SUPPORTED_LANGUAGES -- no shared package between them.
export type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it';

export interface QuizChallengeConfigDTO {
  difficulty: string;
  question_count: number;
}

export interface FlashcardChallengeConfigDTO {
  card_count: number;
}

export interface TrueFalseChallengeConfigDTO {
  difficulty: string;
  question_count: number;
}

export type ChallengerDTO =
  | { challenge_type: 'QUIZ'; language: SupportedLanguage; challenge: QuizChallengeConfigDTO }
  | { challenge_type: 'FLASHCARD'; language: SupportedLanguage; challenge: FlashcardChallengeConfigDTO }
  | { challenge_type: 'TRUE_FALSE'; language: SupportedLanguage; challenge: TrueFalseChallengeConfigDTO };

export interface SchedulerDTO {
  scheduler_id: string;
  name: string;
  weekdays: string[];
  start_time: string;
  alarm_sound: string;
  vibration: boolean;
  strict_mode: boolean;
  object_ids: string[];
  challengers: ChallengerDTO[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulerRequestDTO {
  name: string;
  weekdays: string[];
  start_time: string;
  alarm_sound: string;
  vibration: boolean;
  strict_mode: boolean;
  object_ids: string[];
  challengers: ChallengerDTO[];
  enabled: boolean;
}

export type UpdateSchedulerRequestDTO = Partial<CreateSchedulerRequestDTO>;

export interface ListSchedulersResponseDTO {
  schedulers: SchedulerDTO[];
}

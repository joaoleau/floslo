export type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it';

export interface MultipleChoiceChallengeConfigDTO {
  question_count: number;
}

export interface TrueFalseChallengeConfigDTO {
  question_count: number;
}

export interface DiscoveryChallengeConfigDTO {
  discovery_count: number;
}

export type ChallengerDTO =
  | { challenge_type: 'MULTIPLE_CHOICE'; challenge: MultipleChoiceChallengeConfigDTO }
  | { challenge_type: 'TRUE_FALSE'; challenge: TrueFalseChallengeConfigDTO }
  | { challenge_type: 'DISCOVERY'; challenge: DiscoveryChallengeConfigDTO };

export interface SchedulerDTO {
  scheduler_id: string;
  name: string;
  language: SupportedLanguage;
  weekdays: string[];
  start_time: string;
  alarm_sound: string;
  vibration: boolean;
  sound_enabled?: boolean;
  object_ids: string[];
  challengers: ChallengerDTO[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulerRequestDTO {
  name: string;
  language: SupportedLanguage;
  weekdays: string[];
  start_time: string;
  alarm_sound: string;
  vibration: boolean;
  sound_enabled: boolean;
  object_ids: string[];
  challengers: ChallengerDTO[];
  enabled: boolean;
}

export type UpdateSchedulerRequestDTO = Partial<CreateSchedulerRequestDTO>;

export interface ListSchedulersResponseDTO {
  schedulers: SchedulerDTO[];
}

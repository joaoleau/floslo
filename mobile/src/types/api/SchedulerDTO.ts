// src/types/api/SchedulerDTO.ts

export interface QuizChallengeConfigDTO {
  difficulty: string;
  question_count: number;
}

export interface ChallengerDTO {
  challenge_type: 'QUIZ';
  challenge: QuizChallengeConfigDTO;
}

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

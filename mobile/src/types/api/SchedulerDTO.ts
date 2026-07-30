// src/types/api/SchedulerDTO.ts

export interface SoundDTO {
  name: string;
}

export interface QuizChallengeDTO {
  question_count: number;
  difficulty: string;
}

export interface ChallengerDTO {
  challenge_type: 'QUIZ';
  challenge: QuizChallengeDTO;
}

export interface SchedulerDTO {
  scheduler_id: string;
  name: string;
  week_days: string[];
  start_time: string;
  alarm_sound: SoundDTO;
  object_ids: string[];
  challengers: ChallengerDTO[];
  is_enabled: boolean;
  vibration: boolean;
  created_at: string;
  updated_at: string;
}
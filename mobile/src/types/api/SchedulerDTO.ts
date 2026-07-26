export interface SoundDTO {
  name: string;
  uri: string;
}

export interface QuizChallengeDTO {
  question_count: number;
  difficulties: string[];
}

interface BaseSchedulerDTO {
  scheduler_id: string;
  name: string;
  week_days: string[];
  start_time: string;
  alarm_sound: SoundDTO;
  object_ids: string[];
  is_enabled: boolean;
  vibration: boolean;
  created_at: string;
  updated_at: string;
}

export type SchedulerDTO = BaseSchedulerDTO & {
  challenge_type: 'QUIZ';
  challenge: QuizChallengeDTO;
};

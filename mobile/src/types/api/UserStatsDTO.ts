// src/types/api/UserStatsDTO.ts

export interface UserStatsDTO {
  current_streak: number;
  answered_by_type: Record<string, number>;
}

export interface RecordAnswerRequestDTO {
  challenge_type: string;
  local_date: string;
}

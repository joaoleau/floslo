import { SchedulerDTO } from './SchedulerDTO';

export interface MultipleChoiceAlternativeDTO {
  id: string;
  text: string;
  correct: boolean;
}

export interface ChunkDTO {
  content: string;
  score: number;
  object_key: string;
  page: number;
  chunk_index: number;
  language: string;
}

export interface MultipleChoiceDTO {
  question: string;
  alternatives: MultipleChoiceAlternativeDTO[];
  explanation: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export interface DiscoveryDTO {
  title: string;
  content: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export interface TrueFalseDTO {
  statement: string;
  answer: boolean;
  explanation: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export type ChallengeResultDTO =
  | { challenge_type: 'MULTIPLE_CHOICE'; language: string; multiple_choices: MultipleChoiceDTO[] }
  | { challenge_type: 'TRUE_FALSE'; language: string; true_falses: TrueFalseDTO[] }
  | { challenge_type: 'DISCOVERY'; language: string; discoveries: DiscoveryDTO[] };

export interface RAGRequestDTO {
  scheduler_id: string;
  local_date: string;
}

export interface RAGDTO {
  scheduler: SchedulerDTO;
  challenges: ChallengeResultDTO[];
  current_streak?: number;
}

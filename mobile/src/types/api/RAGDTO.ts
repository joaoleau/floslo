// src/types/api/RAGDTO.ts

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

// Só apresenta o conteúdo, sem pergunta e sem nota.
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

// local_date é o dia local do aparelho (YYYY-MM-DD): a floslo-rag o registra como dia de
// estudo quando o disparo é gerado.
export interface RAGRequestDTO {
  scheduler_id: string;
  local_date: string;
}

// current_streak é a sequência de dias de estudo já com o dia deste disparo; ausente quando a
// floslo-rag não conseguiu registrar o dia.
export interface RAGDTO {
  scheduler: SchedulerDTO;
  challenges: ChallengeResultDTO[];
  current_streak?: number;
}

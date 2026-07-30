// src/types/api/RAGDTO.ts

import { SchedulerDTO } from './SchedulerDTO';

export interface QuizAlternativeDTO {
  id: string;
  text: string;
  correct: boolean;
}

export interface ChunkDTO {
  Content: string;
  Score: number;
  ObjectKey: string;
  Page: number;
  ChunkIndex: number;
  Language: string;
}

export interface QuizChallengeDataDTO {
  question: string;
  alternatives: QuizAlternativeDTO[];
  explanation: string;
  difficulty: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export interface GeneratedQuizChallengeDTO {
  challenge_type: 'QUIZ';
  data: QuizChallengeDataDTO;
}

// Quando houver outros tipos (FLASHCARD, MATH), adicionaremos com um "Union Type" (|)
export type GeneratedChallengeDTO = GeneratedQuizChallengeDTO;

export interface RAGDTO {
  scheduler: SchedulerDTO;
  challenges: GeneratedChallengeDTO[];
}
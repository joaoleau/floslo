// src/types/api/RAGDTO.ts

import { SchedulerDTO } from './SchedulerDTO';

export interface QuizAlternativeDTO {
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

export interface GeneratedQuizDTO {
  question: string;
  alternatives: QuizAlternativeDTO[];
  explanation: string;
  difficulty: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export interface FlashcardDTO {
  title: string;
  content: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export interface TrueFalseDTO {
  statement: string;
  answer: boolean;
  explanation: string;
  difficulty: string;
  tag: string;
  source_chunks: ChunkDTO[];
}

export type ChallengeResultDTO =
  | { challenge_type: 'QUIZ'; language: string; quizzes: GeneratedQuizDTO[] }
  | { challenge_type: 'FLASHCARD'; language: string; flashcards: FlashcardDTO[] }
  | { challenge_type: 'TRUE_FALSE'; language: string; true_falses: TrueFalseDTO[] };

export interface RAGRequestDTO {
  scheduler_id: string;
}

export interface RAGDTO {
  scheduler: SchedulerDTO;
  challenges: ChallengeResultDTO[];
}

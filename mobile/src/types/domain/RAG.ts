// src/types/domain/RAG.ts

import { Scheduler, SupportedLanguage } from './Scheduler';

export interface QuizAlternative {
  id: string;
  text: string;
  correct: boolean;
}

export interface SourceChunk {
  content: string;
  score: number;
  objectKey: string;
  page: number;
  chunkIndex: number;
  language: string;
}

export interface Quiz {
  question: string;
  alternatives: QuizAlternative[];
  explanation: string;
  difficulty: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

export interface Flashcard {
  title: string;
  content: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

export interface TrueFalseItem {
  statement: string;
  answer: boolean;
  explanation: string;
  difficulty: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

// Each generated challenge is flattened, at the mapper boundary, into individually playable
// items in firing order -- this is what lets firing.tsx keep its existing per-item
// currentChallengeIndex paging logic almost unchanged. `language` is carried over from the
// parent ChallengeResultDTO (lost otherwise once flattened) so firing.tsx can show which
// language the content was generated in.
export type ChallengeItem =
  | { type: 'QUIZ'; language: SupportedLanguage; data: Quiz }
  | { type: 'FLASHCARD'; language: SupportedLanguage; data: Flashcard }
  | { type: 'TRUE_FALSE'; language: SupportedLanguage; data: TrueFalseItem };

export interface RAG {
  scheduler: Scheduler;
  challenges: ChallengeItem[];
}

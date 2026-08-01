// src/types/domain/RAG.ts

import { Scheduler } from './Scheduler';

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

export interface RAG {
  scheduler: Scheduler;
  quizzes: Quiz[];
}

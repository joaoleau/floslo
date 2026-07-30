// src/types/domain/RAGResponse.ts

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

export interface QuizChallengeData {
  question: string;
  alternatives: QuizAlternative[];
  explanation: string;
  difficulty: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

export interface GeneratedQuizChallenge {
  challengeType: 'QUIZ';
  data: QuizChallengeData;
}

// Futuros desafios entram aqui
export type GeneratedChallenge = GeneratedQuizChallenge;

export interface RAG {
  scheduler: Scheduler;
  challenges: GeneratedChallenge[];
}
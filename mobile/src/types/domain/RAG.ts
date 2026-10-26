// src/types/domain/RAG.ts

import { Scheduler, SupportedLanguage } from './Scheduler';

export interface MultipleChoiceAlternative {
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

export interface MultipleChoice {
  question: string;
  alternatives: MultipleChoiceAlternative[];
  explanation: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

// Só apresenta o conteúdo ("você sabia?"), sem pergunta e sem nota.
export interface Discovery {
  title: string;
  content: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

export interface TrueFalseItem {
  statement: string;
  answer: boolean;
  explanation: string;
  tag: string;
  sourceChunks: SourceChunk[];
}

// Each generated challenge is flattened, at the mapper boundary, into individually playable
// items in firing order -- this is what lets firing.tsx keep its existing per-item
// currentChallengeIndex paging logic almost unchanged. `language` is carried over from the
// parent ChallengeResultDTO (lost otherwise once flattened) so firing.tsx can show which
// language the content was generated in.
export type ChallengeItem =
  | { type: 'MULTIPLE_CHOICE'; language: SupportedLanguage; data: MultipleChoice }
  | { type: 'TRUE_FALSE'; language: SupportedLanguage; data: TrueFalseItem }
  | { type: 'DISCOVERY'; language: SupportedLanguage; data: Discovery };

export interface RAG {
  scheduler: Scheduler;
  challenges: ChallengeItem[];
  // Sequência de dias de estudo já com o dia deste disparo; ausente quando o dia não foi
  // registrado.
  currentStreak?: number;
}

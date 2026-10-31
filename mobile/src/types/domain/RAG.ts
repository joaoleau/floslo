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

export type ChallengeItem =
  | { type: 'MULTIPLE_CHOICE'; language: SupportedLanguage; data: MultipleChoice }
  | { type: 'TRUE_FALSE'; language: SupportedLanguage; data: TrueFalseItem }
  | { type: 'DISCOVERY'; language: SupportedLanguage; data: Discovery };

export interface RAG {
  scheduler: Scheduler;
  challenges: ChallengeItem[];
  currentStreak?: number;
}

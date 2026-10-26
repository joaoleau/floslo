// src/types/domain/History.ts

export type ChallengeType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'DISCOVERY';

// Resultado que cada componente de desafio devolve ao concluir, pra firing.tsx gravar o
// attempt correspondente no histórico.
export interface ChallengeResult {
  wrongAttempts: number;
}

export interface TagStat {
  tag: string;
  total: number;
  accuracy: number | null;
  hasEnoughData: boolean; // false quando total < MIN_ATTEMPTS_FOR_INSIGHT
}

export interface MistakeEntry {
  id: string;
  sessionId: string;
  challengeType: ChallengeType;
  tag: string;
  promptText: string;
  explanationText: string | null;
  answeredAt: number;
}

export interface SessionSummary {
  id: string;
  schedulerId: string;
  schedulerName: string;
  startedAt: number;
  completedAt: number | null;
  totalChallenges: number;
  correctCount: number;
  answeredCount: number;
}

// Uma alternativa de Múltipla escolha, ou uma das duas opções fixas de Verdadeiro/Falso -- guardado
// pra tela de revisão poder mostrar o desafio original de novo, com a correta destacada.
export interface ReviewOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface AttemptEntry {
  id: string;
  sessionId: string;
  challengeType: ChallengeType;
  tag: string;
  language: string;
  promptText: string;
  explanationText: string | null;
  options: ReviewOption[] | null; // null pra DISCOVERY (não tem alternativas)
  isCorrect: boolean | null;
  wrongAttempts: number;
  answeredAt: number;
  sourceObjectKey: string | null;
  sourcePage: number | null;
}

export interface AttemptDetail extends AttemptEntry {
  schedulerName: string;
}

export interface SessionDetail extends SessionSummary {
  attempts: AttemptEntry[];
}

export interface TagDetail {
  tag: string;
  stat: TagStat;
  recentAttempts: AttemptEntry[];
}

export interface RecordAttemptInput {
  sessionId: string;
  userId: string;
  challengeType: ChallengeType;
  tag: string;
  language: string;
  promptText: string;
  explanationText: string | null;
  options: ReviewOption[] | null;
  isCorrect: boolean | null;
  wrongAttempts: number;
  sourceObjectKey: string | null;
  sourcePage: number | null;
}

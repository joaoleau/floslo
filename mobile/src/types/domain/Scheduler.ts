export interface Sound {
  name: string;
}

export type QuizDifficulty = 'easy' | 'medium' | 'hard';

export interface QuizChallenge {
  questionCount: number;
  difficulty: QuizDifficulty;
}

export interface Challenger {
  challengeType: 'QUIZ';
  challenge: QuizChallenge;
}

export interface Scheduler {
  id: string;
  name: string;
  weekDays: string[];
  startTime: string;
  alarmSound: string;
  objectIds: string[];
  challengers: Challenger[];
  enabled: boolean;
  vibration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

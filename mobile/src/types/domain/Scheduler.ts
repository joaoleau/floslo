export interface Sound {
  name: string;
}

export interface QuizChallenge {
  questionCount: number;
  difficulty: string;
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
  alarmSound: Sound;
  objectIds: string[];
  challengers: Challenger[];
  enabled: boolean;
  vibration: boolean;
  createdAt: Date;
  updatedAt: Date;
}
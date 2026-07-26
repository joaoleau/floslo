export interface Sound {
  name: string;
  uri: string;
}

export interface QuizChallenge {
  questionCount: number;
  difficulties: string[];
}

interface BaseScheduler {
  id: string;
  name: string;
  weekDays: string[];
  startTime: string;
  alarmSound: Sound;
  objectIds: string[];
  enabled: boolean;
  vibration: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type Scheduler = BaseScheduler & { challengeType: 'QUIZ'; challenge: QuizChallenge };

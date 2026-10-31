export interface User {
  id: string;
  username: string;
  email: string;
  currentStreak: number;
  lastActiveDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

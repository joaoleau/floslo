// src/types/domain/UserStats.ts

import { ChallengeType } from '@/types/domain/History';

// Agregados vindos do backend (DynamoDB) -- streak e respondidos-por-tipo são
// reportados pelo firing.tsx a cada desafio concluído (ver api/userStats.ts).
// schedulerCount/objectCount não têm endpoint próprio: são o .length de
// useSchedulersQuery()/useObjectsQuery(), que já existem.
export interface UserStats {
  streakDays: number;
  answeredByType: Record<ChallengeType, number>;
  schedulerCount: number;
  objectCount: number;
}

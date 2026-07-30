import { SchedulerDTO } from '@/types/api/SchedulerDTO';
import { Scheduler, Challenger } from '@/types/domain/Scheduler';

export const schedulerMapper = {
  toDomain(raw: SchedulerDTO): Scheduler {
    const challengers: Challenger[] = raw.challengers.map((item) => {
      if (item.challenge_type === 'QUIZ') {
        return {
          challengeType: 'QUIZ',
          challenge: {
            questionCount: item.challenge.question_count,
            difficulty: item.challenge.difficulty,
          },
        };
      }

      throw new Error(`Tipo de desafio desconhecido: ${item.challenge_type}`);
    });

    return {
      id: raw.scheduler_id,
      name: raw.name,
      weekDays: raw.week_days,
      startTime: raw.start_time,
      alarmSound: { name: raw.alarm_sound.name },
      objectIds: raw.object_ids,
      challengers,
      enabled: raw.is_enabled,
      vibration: raw.vibration,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at),
    };
  },
};
import { SchedulerDTO } from '@/types/api/SchedulerDTO';
import { Scheduler, QuizChallenge } from '@/types/domain/Scheduler';

export const schedulerMapper = {
  toDomain(raw: SchedulerDTO): Scheduler {
    const base = {
      id: raw.scheduler_id,
      name: raw.name,
      weekDays: raw.week_days,
      startTime: raw.start_time,
      alarmSound: { name: raw.alarm_sound.name, uri: raw.alarm_sound.uri },
      objectIds: raw.object_ids,
      enabled: raw.is_enabled,
      vibration: raw.vibration,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at),
    };

    if (raw.challenge_type === 'QUIZ') {
      return {
        ...base,
        challengeType: 'QUIZ',
        challenge: {
          questionCount: raw.challenge.question_count,
          difficulties: raw.challenge.difficulties,
        } as QuizChallenge,
      };
    }

    throw new Error(`Tipo de desafio desconhecido: ${raw.challenge_type}`);
  },
};

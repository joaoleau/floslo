import {
  ChallengerDTO,
  CreateSchedulerRequestDTO,
  SchedulerDTO,
  UpdateSchedulerRequestDTO,
} from '@/types/api/SchedulerDTO';
import { Challenger, QuizDifficulty, Scheduler } from '@/types/domain/Scheduler';

// The UI (WeekDays component) and the native alarm-scheduling logic
// (schedulerService's calculateNextTrigger) both use lowercase full day
// names, but the backend's Weekday enum expects 3-letter uppercase codes.
const DOMAIN_TO_API_WEEKDAY: Record<string, string> = {
  sunday: 'SUN',
  monday: 'MON',
  tuesday: 'TUE',
  wednesday: 'WED',
  thursday: 'THU',
  friday: 'FRI',
  saturday: 'SAT',
};

const API_TO_DOMAIN_WEEKDAY: Record<string, string> = {
  SUN: 'sunday',
  MON: 'monday',
  TUE: 'tuesday',
  WED: 'wednesday',
  THU: 'thursday',
  FRI: 'friday',
  SAT: 'saturday',
};

function weekDaysToDomain(raw: string[]): string[] {
  return (raw ?? []).map((day) => API_TO_DOMAIN_WEEKDAY[day] ?? day.toLowerCase());
}

function weekDaysToDTO(domain: string[]): string[] {
  return (domain ?? []).map((day) => DOMAIN_TO_API_WEEKDAY[day] ?? day.toUpperCase());
}

function challengerToDomain(item: ChallengerDTO): Challenger {
  switch (item.challenge_type) {
    case 'QUIZ':
      return {
        challengeType: 'QUIZ',
        language: item.language,
        challenge: {
          questionCount: item.challenge.question_count,
          difficulty: item.challenge.difficulty as QuizDifficulty,
        },
      };
    case 'FLASHCARD':
      return {
        challengeType: 'FLASHCARD',
        language: item.language,
        challenge: { cardCount: item.challenge.card_count },
      };
    case 'TRUE_FALSE':
      return {
        challengeType: 'TRUE_FALSE',
        language: item.language,
        challenge: {
          questionCount: item.challenge.question_count,
          difficulty: item.challenge.difficulty as QuizDifficulty,
        },
      };
    default: {
      const unknown: { challenge_type: string } = item;
      throw new Error(`Tipo de desafio desconhecido: ${unknown.challenge_type}`);
    }
  }
}

function challengersToDomain(raw: ChallengerDTO[]): Challenger[] {
  return (raw ?? []).map(challengerToDomain);
}

function challengerToDTO(item: Challenger): ChallengerDTO {
  switch (item.challengeType) {
    case 'QUIZ':
      return {
        challenge_type: 'QUIZ',
        language: item.language,
        challenge: {
          question_count: item.challenge.questionCount,
          difficulty: item.challenge.difficulty,
        },
      };
    case 'FLASHCARD':
      return {
        challenge_type: 'FLASHCARD',
        language: item.language,
        challenge: { card_count: item.challenge.cardCount },
      };
    case 'TRUE_FALSE':
      return {
        challenge_type: 'TRUE_FALSE',
        language: item.language,
        challenge: {
          question_count: item.challenge.questionCount,
          difficulty: item.challenge.difficulty,
        },
      };
  }
}

function challengersToDTO(domain: Challenger[]): ChallengerDTO[] {
  return (domain ?? []).map(challengerToDTO);
}

export const schedulerMapper = {
  toDomain(raw: SchedulerDTO): Scheduler {
    return {
      id: raw.scheduler_id,
      name: raw.name,
      weekDays: weekDaysToDomain(raw.weekdays),
      startTime: raw.start_time,
      alarmSound: raw.alarm_sound,
      objectIds: raw.object_ids,
      challengers: challengersToDomain(raw.challengers),
      enabled: raw.enabled,
      vibration: raw.vibration,
      // Schedulers criados antes desse campo existir não o têm no Dynamo -- som
      // sempre tocava por padrão.
      soundEnabled: raw.sound_enabled ?? true,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at),
    };
  },

  toDTO(domain: Scheduler): CreateSchedulerRequestDTO {
    return {
      name: domain.name,
      weekdays: weekDaysToDTO(domain.weekDays),
      start_time: domain.startTime,
      alarm_sound: domain.alarmSound,
      vibration: domain.vibration,
      sound_enabled: domain.soundEnabled,
      object_ids: domain.objectIds,
      challengers: challengersToDTO(domain.challengers),
      enabled: domain.enabled,
    };
  },

  toUpdateDTO(domain: Partial<Scheduler>): UpdateSchedulerRequestDTO {
    return {
      name: domain.name,
      weekdays: domain.weekDays ? weekDaysToDTO(domain.weekDays) : undefined,
      start_time: domain.startTime,
      alarm_sound: domain.alarmSound,
      vibration: domain.vibration,
      sound_enabled: domain.soundEnabled,
      object_ids: domain.objectIds,
      challengers: domain.challengers ? challengersToDTO(domain.challengers) : undefined,
      enabled: domain.enabled,
    };
  },
};

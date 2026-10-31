import {
  ChallengerDTO,
  CreateSchedulerRequestDTO,
  SchedulerDTO,
  UpdateSchedulerRequestDTO,
} from '@/types/api/SchedulerDTO';
import { Challenger, Scheduler } from '@/types/domain/Scheduler';

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
    case 'MULTIPLE_CHOICE':
      return {
        challengeType: 'MULTIPLE_CHOICE',
        challenge: { questionCount: item.challenge.question_count },
      };
    case 'TRUE_FALSE':
      return {
        challengeType: 'TRUE_FALSE',
        challenge: { questionCount: item.challenge.question_count },
      };
    case 'DISCOVERY':
      return {
        challengeType: 'DISCOVERY',
        challenge: { discoveryCount: item.challenge.discovery_count },
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
    case 'MULTIPLE_CHOICE':
      return {
        challenge_type: 'MULTIPLE_CHOICE',
        challenge: { question_count: item.challenge.questionCount },
      };
    case 'TRUE_FALSE':
      return {
        challenge_type: 'TRUE_FALSE',
        challenge: { question_count: item.challenge.questionCount },
      };
    case 'DISCOVERY':
      return {
        challenge_type: 'DISCOVERY',
        challenge: { discovery_count: item.challenge.discoveryCount },
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
      language: raw.language,
      weekDays: weekDaysToDomain(raw.weekdays),
      startTime: raw.start_time,
      alarmSound: raw.alarm_sound,
      objectIds: raw.object_ids,
      challengers: challengersToDomain(raw.challengers),
      enabled: raw.enabled,
      vibration: raw.vibration,
      soundEnabled: raw.sound_enabled ?? true,
      createdAt: new Date(raw.created_at),
      updatedAt: new Date(raw.updated_at),
    };
  },

  toDTO(domain: Scheduler): CreateSchedulerRequestDTO {
    return {
      name: domain.name,
      language: domain.language,
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
      language: domain.language,
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

import { SupportedLanguage } from '@/types/api/SchedulerDTO';
import { i18n } from '@/i18n';

export interface Sound {
  name: string;
}

export type { SupportedLanguage };

function language(value: SupportedLanguage, flag: string) {
  return {
    value,
    flag,
    get label() {
      return i18n.t(`languages.${value}`);
    },
  };
}

export const SUPPORTED_LANGUAGES: { value: SupportedLanguage; label: string; flag: string }[] = [
  language('pt', '🇧🇷'),
  language('en', '🇺🇸'),
  language('es', '🇪🇸'),
  language('fr', '🇫🇷'),
  language('de', '🇩🇪'),
  language('it', '🇮🇹'),
];

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((option) => [option.value, option.flag]),
) as Record<SupportedLanguage, string>;

export const MAX_ITEMS_PER_SCHEDULER = 10;

export interface MultipleChoiceChallenge {
  questionCount: number;
}

export interface TrueFalseChallenge {
  questionCount: number;
}

export interface DiscoveryChallenge {
  discoveryCount: number;
}

export type Challenger =
  | { challengeType: 'MULTIPLE_CHOICE'; challenge: MultipleChoiceChallenge }
  | { challengeType: 'TRUE_FALSE'; challenge: TrueFalseChallenge }
  | { challengeType: 'DISCOVERY'; challenge: DiscoveryChallenge };

export function challengerItemCount(challenger: Challenger): number {
  switch (challenger.challengeType) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      return challenger.challenge.questionCount;
    case 'DISCOVERY':
      return challenger.challenge.discoveryCount;
  }
}

export function totalItemCount(challengers: Challenger[]): number {
  return challengers.reduce((total, challenger) => total + challengerItemCount(challenger), 0);
}

export type ChallengeTypeName = Challenger['challengeType'];

export const CHALLENGE_TYPE_ORDER: ChallengeTypeName[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'DISCOVERY'];

export function makeChallenger(type: ChallengeTypeName, count: number): Challenger {
  switch (type) {
    case 'MULTIPLE_CHOICE':
      return { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: count } };
    case 'TRUE_FALSE':
      return { challengeType: 'TRUE_FALSE', challenge: { questionCount: count } };
    case 'DISCOVERY':
      return { challengeType: 'DISCOVERY', challenge: { discoveryCount: count } };
  }
}

export function challengerCount(challengers: Challenger[], type: ChallengeTypeName): number {
  return challengers
    .filter((challenger) => challenger.challengeType === type)
    .reduce((total, challenger) => total + challengerItemCount(challenger), 0);
}

export function withChallengerCount(challengers: Challenger[], type: ChallengeTypeName, count: number): Challenger[] {
  return CHALLENGE_TYPE_ORDER.flatMap((current) => {
    const items = current === type ? count : challengerCount(challengers, current);
    return items > 0 ? [makeChallenger(current, items)] : [];
  });
}

export interface Scheduler {
  id: string;
  name: string;
  language: SupportedLanguage;
  weekDays: string[];
  startTime: string;
  alarmSound: string;
  objectIds: string[];
  challengers: Challenger[];
  enabled: boolean;
  vibration: boolean;
  soundEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

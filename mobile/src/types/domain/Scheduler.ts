import { SupportedLanguage } from '@/types/api/SchedulerDTO';
import { i18n } from '@/i18n';

export interface Sound {
  name: string;
}

export type { SupportedLanguage };

// Idiomas dos desafios. O nome de cada um é lido do dicionário na hora do acesso (getter), no
// idioma do app.
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

// Total de itens (perguntas, afirmações, descobertas) que um agendador pede por disparo, somando
// todos os desafios. Mantenha em sincronia com MaxItemsPerScheduler em
// api/internal/service/scheduler.go.
export const MAX_ITEMS_PER_SCHEDULER = 10;

export interface MultipleChoiceChallenge {
  questionCount: number;
}

export interface TrueFalseChallenge {
  questionCount: number;
}

// Só apresenta o conteúdo ("você sabia?"), sem pergunta e sem nota.
export interface DiscoveryChallenge {
  discoveryCount: number;
}

export type Challenger =
  | { challengeType: 'MULTIPLE_CHOICE'; challenge: MultipleChoiceChallenge }
  | { challengeType: 'TRUE_FALSE'; challenge: TrueFalseChallenge }
  | { challengeType: 'DISCOVERY'; challenge: DiscoveryChallenge };

// Quantos itens um desafio pede por disparo.
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

// Ordem fixa dos tipos na tela de configuração e no disparo.
export const CHALLENGE_TYPE_ORDER: ChallengeTypeName[] = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'DISCOVERY'];

// Um desafio do tipo dado pedindo `count` itens.
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

// Quantos itens o agendador pede de um tipo (soma, se por algum motivo houver mais de um
// desafio do mesmo tipo).
export function challengerCount(challengers: Challenger[], type: ChallengeTypeName): number {
  return challengers
    .filter((challenger) => challenger.challengeType === type)
    .reduce((total, challenger) => total + challengerItemCount(challenger), 0);
}

// A lista de desafios com `count` itens do tipo dado (0 tira o tipo). Sempre devolve no máximo
// um desafio por tipo e na ordem fixa, então os desafios do mesmo tipo são fundidos.
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

// src/mappers/ragMapper.ts

import {
  ChallengeResultDTO,
  DiscoveryDTO,
  MultipleChoiceDTO,
  RAGDTO,
  TrueFalseDTO,
} from '@/types/api/RAGDTO';
import { ChallengeItem, Discovery, MultipleChoice, RAG, SourceChunk, TrueFalseItem } from '@/types/domain/RAG';
import { SupportedLanguage } from '@/types/domain/Scheduler';
import { schedulerMapper } from './schedulerMapper';
import { shuffle } from '@/lib/shuffle';

function sourceChunksToDomain(chunks: { content: string; score: number; object_key: string; page: number; chunk_index: number; language: string }[]): SourceChunk[] {
  return chunks.map((chunk) => ({
    content: chunk.content,
    score: chunk.score,
    objectKey: chunk.object_key,
    page: chunk.page,
    chunkIndex: chunk.chunk_index,
    language: chunk.language,
  }));
}

function multipleChoiceToDomain(raw: MultipleChoiceDTO): MultipleChoice {
  return {
    question: raw.question,
    explanation: raw.explanation,
    tag: raw.tag,
    // O modelo tende a escrever a alternativa certa primeiro; embaralhar aqui (uma vez por
    // disparo, já que a consulta do disparo não é refeita) tira esse padrão.
    alternatives: shuffle(
      raw.alternatives.map((alt) => ({
        id: alt.id,
        text: alt.text,
        correct: alt.correct,
      })),
    ),
    sourceChunks: sourceChunksToDomain(raw.source_chunks),
  };
}

function discoveryToDomain(raw: DiscoveryDTO): Discovery {
  return {
    title: raw.title,
    content: raw.content,
    tag: raw.tag,
    sourceChunks: sourceChunksToDomain(raw.source_chunks),
  };
}

function trueFalseToDomain(raw: TrueFalseDTO): TrueFalseItem {
  return {
    statement: raw.statement,
    answer: raw.answer,
    explanation: raw.explanation,
    tag: raw.tag,
    sourceChunks: sourceChunksToDomain(raw.source_chunks),
  };
}

function challengeResultToItems(raw: ChallengeResultDTO): ChallengeItem[] {
  const language = raw.language as SupportedLanguage;
  switch (raw.challenge_type) {
    case 'MULTIPLE_CHOICE':
      return raw.multiple_choices.map((q) => ({ type: 'MULTIPLE_CHOICE' as const, language, data: multipleChoiceToDomain(q) }));
    case 'TRUE_FALSE':
      return raw.true_falses.map((t) => ({ type: 'TRUE_FALSE' as const, language, data: trueFalseToDomain(t) }));
    case 'DISCOVERY':
      return raw.discoveries.map((d) => ({ type: 'DISCOVERY' as const, language, data: discoveryToDomain(d) }));
    default:
      return [];
  }
}

// Ordem dos tipos no disparo: a descoberta primeiro, para apresentar o conteúdo antes de
// cobrá-lo, depois múltipla escolha e verdadeiro ou falso. Vale para qualquer agendador, inclusive
// os salvos antes, porque a ordem gravada no agendador é a do formulário.
export const FIRING_TYPE_ORDER: ChallengeItem['type'][] = ['DISCOVERY', 'MULTIPLE_CHOICE', 'TRUE_FALSE'];

function firingRank(type: string): number {
  const rank = FIRING_TYPE_ORDER.indexOf(type as ChallengeItem['type']);
  return rank === -1 ? FIRING_TYPE_ORDER.length : rank;
}

export const ragMapper = {
  toDomain(raw: RAGDTO): RAG {
    const results = [...(raw.challenges ?? [])].sort(
      (a, b) => firingRank(a.challenge_type) - firingRank(b.challenge_type)
    );
    return {
      scheduler: schedulerMapper.toDomain(raw.scheduler),
      challenges: results.flatMap(challengeResultToItems),
      currentStreak: raw.current_streak,
    };
  },
};

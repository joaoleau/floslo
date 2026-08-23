// src/mappers/ragMapper.ts

import { ChallengeResultDTO, FlashcardDTO, GeneratedQuizDTO, RAGDTO, TrueFalseDTO } from '@/types/api/RAGDTO';
import { ChallengeItem, Flashcard, Quiz, RAG, SourceChunk, TrueFalseItem } from '@/types/domain/RAG';
import { SupportedLanguage } from '@/types/domain/Scheduler';
import { schedulerMapper } from './schedulerMapper';

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

function quizToDomain(raw: GeneratedQuizDTO): Quiz {
  return {
    question: raw.question,
    explanation: raw.explanation,
    difficulty: raw.difficulty,
    tag: raw.tag,
    alternatives: raw.alternatives.map((alt) => ({
      id: alt.id,
      text: alt.text,
      correct: alt.correct,
    })),
    sourceChunks: sourceChunksToDomain(raw.source_chunks),
  };
}

function flashcardToDomain(raw: FlashcardDTO): Flashcard {
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
    difficulty: raw.difficulty,
    tag: raw.tag,
    sourceChunks: sourceChunksToDomain(raw.source_chunks),
  };
}

function challengeResultToItems(raw: ChallengeResultDTO): ChallengeItem[] {
  const language = raw.language as SupportedLanguage;
  switch (raw.challenge_type) {
    case 'QUIZ':
      return raw.quizzes.map((q) => ({ type: 'QUIZ' as const, language, data: quizToDomain(q) }));
    case 'FLASHCARD':
      return raw.flashcards.map((f) => ({ type: 'FLASHCARD' as const, language, data: flashcardToDomain(f) }));
    case 'TRUE_FALSE':
      return raw.true_falses.map((t) => ({ type: 'TRUE_FALSE' as const, language, data: trueFalseToDomain(t) }));
    default:
      return [];
  }
}

export const ragMapper = {
  toDomain(raw: RAGDTO): RAG {
    return {
      scheduler: schedulerMapper.toDomain(raw.scheduler),
      challenges: (raw.challenges ?? []).flatMap(challengeResultToItems),
    };
  },
};

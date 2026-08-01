// src/mappers/ragMapper.ts

import { GeneratedQuizDTO, RAGDTO } from '@/types/api/RAGDTO';
import { Quiz, RAG } from '@/types/domain/RAG';
import { schedulerMapper } from './schedulerMapper';

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
    sourceChunks: raw.source_chunks.map((chunk) => ({
      content: chunk.content,
      score: chunk.score,
      objectKey: chunk.object_key,
      page: chunk.page,
      chunkIndex: chunk.chunk_index,
      language: chunk.language,
    })),
  };
}

export const ragMapper = {
  toDomain(raw: RAGDTO): RAG {
    return {
      scheduler: schedulerMapper.toDomain(raw.scheduler),
      quizzes: raw.quizzes.map(quizToDomain),
    };
  },
};

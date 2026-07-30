// src/mappers/ragMapper.ts

import { RAGDTO } from '@/types/api/RAGDTO';
import { RAG, GeneratedChallenge } from '@/types/domain/RAG';
import { schedulerMapper } from './schedulerMapper';

export const ragMapper = {
  toDomain(raw: RAGDTO): RAG {
    
    // Mapeia o array polimórfico de desafios
    const challenges: GeneratedChallenge[] = raw.challenges.map((challengeDto) => {
      
      if (challengeDto.challenge_type === 'QUIZ') {
        return {
          challengeType: 'QUIZ',
          data: {
            question: challengeDto.data.question,
            explanation: challengeDto.data.explanation,
            difficulty: challengeDto.data.difficulty,
            tag: challengeDto.data.tag,
            
            alternatives: challengeDto.data.alternatives.map((alt) => ({
              id: alt.id,
              text: alt.text,
              correct: alt.correct,
            })),
            
            // Ajustando a capitalização (Maiúscula -> camelCase) que vem dos chunks
            sourceChunks: challengeDto.data.source_chunks.map((chunk) => ({
              content: chunk.Content,
              score: chunk.Score,
              objectKey: chunk.ObjectKey,
              page: chunk.Page,
              chunkIndex: chunk.ChunkIndex,
              language: chunk.Language,
            })),
          },
        };
      }

      throw new Error(`Tipo de desafio gerado desconhecido no RAG: ${challengeDto.challenge_type}`);
    });

    return {
      scheduler: schedulerMapper.toDomain(raw.scheduler),
      challenges,
    };
  },
};
import { ragMapper } from './ragMapper';
import { RAGDTO, ChunkDTO } from '@/types/api/RAGDTO';
import { SchedulerDTO } from '@/types/api/SchedulerDTO';

const schedulerDTO: SchedulerDTO = {
  scheduler_id: 'sched-1',
  name: 'Revisão',
  weekdays: ['MON'],
  start_time: '08:00',
  alarm_sound: 'chic_pop',
  vibration: true,
  sound_enabled: true,
  object_ids: [],
  challengers: [],
  enabled: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const chunk: ChunkDTO = {
  content: 'Trecho do material',
  score: 0.87,
  object_key: 'obj-1',
  page: 3,
  chunk_index: 2,
  language: 'pt',
};

describe('ragMapper.toDomain', () => {
  it('maps snake_case source chunk fields to camelCase', () => {
    const rag = ragMapper.toDomain({
      scheduler: schedulerDTO,
      challenges: [
        {
          challenge_type: 'QUIZ',
          language: 'pt',
          quizzes: [
            {
              question: 'Qual a capital da França?',
              alternatives: [{ id: 'a1', text: 'Paris', correct: true }],
              explanation: 'Paris é a capital.',
              difficulty: 'easy',
              tag: 'geografia',
              source_chunks: [chunk],
            },
          ],
        },
      ],
    });

    const quiz = rag.challenges[0];
    expect(quiz.type).toBe('QUIZ');
    if (quiz.type !== 'QUIZ') throw new Error('expected a QUIZ challenge');
    expect(quiz.data.sourceChunks).toEqual([
      { content: 'Trecho do material', score: 0.87, objectKey: 'obj-1', page: 3, chunkIndex: 2, language: 'pt' },
    ]);
  });

  it('flattens every challenge type into a single ChallengeItem list', () => {
    const dto: RAGDTO = {
      scheduler: schedulerDTO,
      challenges: [
        {
          challenge_type: 'FLASHCARD',
          language: 'en',
          flashcards: [{ title: 'Título', content: 'Conteúdo', tag: 'ingles', source_chunks: [] }],
        },
        {
          challenge_type: 'TRUE_FALSE',
          language: 'es',
          true_falses: [
            { statement: 'O sol é uma estrela.', answer: true, explanation: '...', difficulty: 'medium', tag: 'ciencias', source_chunks: [] },
          ],
        },
      ],
    };

    const rag = ragMapper.toDomain(dto);
    expect(rag.challenges).toHaveLength(2);
    expect(rag.challenges.map((c) => c.type)).toEqual(['FLASHCARD', 'TRUE_FALSE']);
    expect(rag.challenges.map((c) => c.language)).toEqual(['en', 'es']);
  });

  it('maps the nested scheduler through schedulerMapper', () => {
    const rag = ragMapper.toDomain({ scheduler: schedulerDTO, challenges: [] });
    expect(rag.scheduler.id).toBe('sched-1');
    expect(rag.scheduler.weekDays).toEqual(['monday']);
  });

  it('treats a missing challenges array as empty instead of throwing', () => {
    const rag = ragMapper.toDomain({ scheduler: schedulerDTO } as unknown as RAGDTO);
    expect(rag.challenges).toEqual([]);
  });
});

import { ragMapper } from './ragMapper';
import { RAGDTO, ChunkDTO } from '@/types/api/RAGDTO';
import { SchedulerDTO } from '@/types/api/SchedulerDTO';

const schedulerDTO: SchedulerDTO = {
  scheduler_id: 'sched-1',
  name: 'Revisão',
  language: 'pt',
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
          challenge_type: 'MULTIPLE_CHOICE',
          language: 'pt',
          multiple_choices: [
            {
              question: 'Qual a capital da França?',
              alternatives: [{ id: 'a1', text: 'Paris', correct: true }],
              explanation: 'Paris é a capital.',
              tag: 'geografia',
              source_chunks: [chunk],
            },
          ],
        },
      ],
    });

    const multipleChoice = rag.challenges[0];
    expect(multipleChoice.type).toBe('MULTIPLE_CHOICE');
    if (multipleChoice.type !== 'MULTIPLE_CHOICE') throw new Error('expected a MULTIPLE_CHOICE challenge');
    expect(multipleChoice.data.sourceChunks).toEqual([
      { content: 'Trecho do material', score: 0.87, objectKey: 'obj-1', page: 3, chunkIndex: 2, language: 'pt' },
    ]);
  });

  it('flattens every challenge type into a single ChallengeItem list', () => {
    const dto: RAGDTO = {
      scheduler: schedulerDTO,
      challenges: [
        {
          challenge_type: 'MULTIPLE_CHOICE',
          language: 'en',
          multiple_choices: [{ question: 'O que é X?', alternatives: [], explanation: 'X é Y.', tag: 'ingles', source_chunks: [] }],
        },
        {
          challenge_type: 'TRUE_FALSE',
          language: 'es',
          true_falses: [{ statement: 'O sol é uma estrela.', answer: true, explanation: '...', tag: 'ciencias', source_chunks: [] }],
        },
        {
          challenge_type: 'DISCOVERY',
          language: 'fr',
          discoveries: [{ title: 'Um gancho', content: 'Uma explicação.', tag: 'historia', source_chunks: [] }],
        },
      ],
    };

    const rag = ragMapper.toDomain(dto);
    expect(rag.challenges).toHaveLength(3);
    expect(rag.challenges.map((c) => c.type)).toEqual(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'DISCOVERY']);
    expect(rag.challenges.map((c) => c.language)).toEqual(['en', 'es', 'fr']);
  });

  it('maps the discovery title and content', () => {
    const rag = ragMapper.toDomain({
      scheduler: schedulerDTO,
      challenges: [
        {
          challenge_type: 'DISCOVERY',
          language: 'pt',
          discoveries: [{ title: 'Um gancho', content: 'Uma explicação.', tag: 't', source_chunks: [] }],
        },
      ],
    });

    const [discovery] = rag.challenges;
    if (discovery.type !== 'DISCOVERY') throw new Error('unexpected item type');
    expect(discovery.data).toMatchObject({ title: 'Um gancho', content: 'Uma explicação.' });
  });

  it('never carries a chunk key or an origin', () => {
    const rag = ragMapper.toDomain({
      scheduler: schedulerDTO,
      challenges: [
        {
          challenge_type: 'TRUE_FALSE',
          language: 'pt',
          true_falses: [{ statement: 'A', answer: true, explanation: '', tag: 't', source_chunks: [] }],
        },
      ],
    });

    expect(rag.challenges[0].data).not.toHaveProperty('chunkKey');
    expect(rag.challenges[0].data).not.toHaveProperty('origin');
  });

  it('never carries a difficulty', () => {
    const rag = ragMapper.toDomain({
      scheduler: schedulerDTO,
      challenges: [
        {
          challenge_type: 'MULTIPLE_CHOICE',
          language: 'pt',
          multiple_choices: [{ question: 'Q', alternatives: [], explanation: '', tag: 't', source_chunks: [] }],
        },
      ],
    });

    expect(JSON.stringify(rag.challenges)).not.toContain('difficulty');
  });

  it('maps the nested scheduler through schedulerMapper', () => {
    const rag = ragMapper.toDomain({ scheduler: schedulerDTO, challenges: [] });
    expect(rag.scheduler.id).toBe('sched-1');
    expect(rag.scheduler.language).toBe('pt');
    expect(rag.scheduler.weekDays).toEqual(['monday']);
  });

  it('carries the current streak sent with the firing, and leaves it undefined when absent', () => {
    expect(ragMapper.toDomain({ scheduler: schedulerDTO, challenges: [], current_streak: 5 }).currentStreak).toBe(5);
    expect(ragMapper.toDomain({ scheduler: schedulerDTO, challenges: [] }).currentStreak).toBeUndefined();
  });

  it('treats a missing challenges array as empty instead of throwing', () => {
    const rag = ragMapper.toDomain({ scheduler: schedulerDTO } as unknown as RAGDTO);
    expect(rag.challenges).toEqual([]);
  });
});

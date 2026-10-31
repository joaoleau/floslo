import { schedulerMapper } from './schedulerMapper';
import { SchedulerDTO } from '@/types/api/SchedulerDTO';
import { Scheduler } from '@/types/domain/Scheduler';

const baseDTO: SchedulerDTO = {
  scheduler_id: 'sched-1',
  name: 'Revisão de Inglês',
  language: 'en',
  weekdays: ['MON', 'WED', 'FRI'],
  start_time: '07:30',
  alarm_sound: 'chic_pop',
  vibration: true,
  sound_enabled: true,
  object_ids: ['obj-1', 'obj-2'],
  challengers: [
    { challenge_type: 'MULTIPLE_CHOICE', challenge: { question_count: 4 } },
    { challenge_type: 'TRUE_FALSE', challenge: { question_count: 2 } },
    { challenge_type: 'DISCOVERY', challenge: { discovery_count: 1 } },
  ],
  enabled: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('schedulerMapper.toDomain', () => {
  it('converts snake_case API weekday codes to the lowercase full names the UI uses', () => {
    const domain = schedulerMapper.toDomain(baseDTO);
    expect(domain.weekDays).toEqual(['monday', 'wednesday', 'friday']);
  });

  it('maps every challenge type with its own config shape', () => {
    const domain = schedulerMapper.toDomain(baseDTO);
    expect(domain.challengers).toEqual([
      { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 4 } },
      { challengeType: 'TRUE_FALSE', challenge: { questionCount: 2 } },
      { challengeType: 'DISCOVERY', challenge: { discoveryCount: 1 } },
    ]);
  });

  it('carries the language on the scheduler, not on each challenge', () => {
    const domain = schedulerMapper.toDomain(baseDTO);
    expect(domain.language).toBe('en');
    for (const challenger of domain.challengers) {
      expect(challenger).not.toHaveProperty('language');
    }
  });

  it('never carries a difficulty', () => {
    const domain = schedulerMapper.toDomain(baseDTO);
    expect(JSON.stringify(domain)).not.toContain('difficulty');
  });

  it('defaults soundEnabled to true for schedulers created before that field existed', () => {
    const { sound_enabled: _sound_enabled, ...withoutSoundEnabled } = baseDTO;
    const domain = schedulerMapper.toDomain(withoutSoundEnabled as SchedulerDTO);
    expect(domain.soundEnabled).toBe(true);
  });

  it('parses timestamps into real Date objects', () => {
    const domain = schedulerMapper.toDomain(baseDTO);
    expect(domain.createdAt).toBeInstanceOf(Date);
    expect(domain.updatedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('fails loudly on an unknown challenge type instead of dropping it', () => {
    const dto = { ...baseDTO, challengers: [{ challenge_type: 'MATCHING', challenge: {} }] } as unknown as SchedulerDTO;
    expect(() => schedulerMapper.toDomain(dto)).toThrow('Tipo de desafio desconhecido: MATCHING');
  });
});

describe('schedulerMapper.toDTO', () => {
  const domainScheduler: Scheduler = {
    id: 'sched-1',
    name: 'Revisão de Inglês',
    language: 'en',
    weekDays: ['monday', 'wednesday', 'friday'],
    startTime: '07:30',
    alarmSound: 'chic_pop',
    objectIds: ['obj-1', 'obj-2'],
    challengers: [
      { challengeType: 'MULTIPLE_CHOICE', challenge: { questionCount: 5 } },
      { challengeType: 'DISCOVERY', challenge: { discoveryCount: 2 } },
    ],
    enabled: true,
    vibration: true,
    soundEnabled: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  it('converts lowercase weekday names back to the 3-letter uppercase API codes', () => {
    const dto = schedulerMapper.toDTO(domainScheduler);
    expect(dto.weekdays).toEqual(['MON', 'WED', 'FRI']);
  });

  it('sends the scheduler language and the config of every challenge type', () => {
    const dto = schedulerMapper.toDTO(domainScheduler);
    expect(dto.language).toBe('en');
    expect(dto.challengers).toEqual([
      { challenge_type: 'MULTIPLE_CHOICE', challenge: { question_count: 5 } },
      { challenge_type: 'DISCOVERY', challenge: { discovery_count: 2 } },
    ]);
  });

  it('round-trips a scheduler through toDomain -> toDTO -> toDomain without losing data', () => {
    const domain = schedulerMapper.toDomain(baseDTO);
    const dto = schedulerMapper.toDTO(domain);
    const roundTripped = schedulerMapper.toDomain({
      ...baseDTO,
      ...dto,
      scheduler_id: baseDTO.scheduler_id,
      created_at: baseDTO.created_at,
      updated_at: baseDTO.updated_at,
    });

    expect(roundTripped.weekDays).toEqual(domain.weekDays);
    expect(roundTripped.challengers).toEqual(domain.challengers);
    expect(roundTripped.name).toBe(domain.name);
    expect(roundTripped.language).toBe(domain.language);
  });
});

describe('schedulerMapper.toUpdateDTO', () => {
  it('sends only the fields that changed, including the language', () => {
    expect(schedulerMapper.toUpdateDTO({ language: 'fr' })).toEqual({
      name: undefined,
      language: 'fr',
      weekdays: undefined,
      start_time: undefined,
      alarm_sound: undefined,
      vibration: undefined,
      sound_enabled: undefined,
      object_ids: undefined,
      challengers: undefined,
      enabled: undefined,
    });
  });
});

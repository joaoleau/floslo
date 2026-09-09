const mockGetAllSync = jest.fn();
const mockGetFirstSync = jest.fn();
const mockRunSync = jest.fn();

// historyService talks to SQLite through db/client's `db` export -- mocked here so these
// tests exercise the service's own logic (accuracy math, sorting, date-window math)
// without touching a real database.
jest.mock('@/db/client', () => ({
  db: {
    getAllSync: (...args: unknown[]) => mockGetAllSync(...args),
    getFirstSync: (...args: unknown[]) => mockGetFirstSync(...args),
    runSync: (...args: unknown[]) => mockRunSync(...args),
  },
  generateId: () => 'generated-id',
}));

import { historyService } from './historyService';

beforeEach(() => {
  mockGetAllSync.mockReset();
  mockGetFirstSync.mockReset();
  mockRunSync.mockReset();
});

describe('historyService.getTagBreakdown', () => {
  it('computes accuracy only from graded attempts, and flags tags below the minimum as "not enough data"', () => {
    mockGetAllSync.mockReturnValue([
      { tag: 'matematica', total: 10, correct: 3, graded: 10 },
      { tag: 'ingles', total: 5, correct: 4, graded: 5 },
      { tag: 'flashcards-sem-nota', total: 2, correct: 0, graded: 0 },
    ]);

    const result = historyService.getTagBreakdown('user-1');

    const bySubject = Object.fromEntries(result.map((stat) => [stat.tag, stat]));
    expect(bySubject.matematica).toEqual({ tag: 'matematica', total: 10, accuracy: 0.3, hasEnoughData: true });
    expect(bySubject.ingles).toEqual({ tag: 'ingles', total: 5, accuracy: 0.8, hasEnoughData: true });
    // graded=0 (e.g. a tag answered only via flashcards, which have no right/wrong) must not
    // divide by zero -- accuracy stays null instead of NaN.
    expect(bySubject['flashcards-sem-nota']).toEqual({
      tag: 'flashcards-sem-nota',
      total: 2,
      accuracy: null,
      hasEnoughData: false,
    });
  });

  it('sorts tags with enough data first, worst accuracy first, and pushes "not enough data" tags last', () => {
    mockGetAllSync.mockReturnValue([
      { tag: 'boa-nota-pouco-dado', total: 1, correct: 1, graded: 1 },
      { tag: 'pior-nota', total: 10, correct: 3, graded: 10 },
      { tag: 'melhor-nota', total: 10, correct: 8, graded: 10 },
    ]);

    const result = historyService.getTagBreakdown('user-1');

    expect(result.map((stat) => stat.tag)).toEqual(['pior-nota', 'melhor-nota', 'boa-nota-pouco-dado']);
  });
});

describe('historyService.getDailyActivity', () => {
  it('queries only attempts answered within the requested window', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T12:00:00Z'));
    mockGetAllSync.mockReturnValue([]);

    historyService.getDailyActivity('user-1', 30);

    expect(mockGetAllSync).toHaveBeenCalledTimes(1);
    const [, params] = mockGetAllSync.mock.calls[0];
    const [userId, sinceMs] = params;
    expect(userId).toBe('user-1');
    expect(sinceMs).toBe(new Date('2026-03-11T12:00:00Z').getTime() - 30 * 24 * 60 * 60 * 1000);

    jest.useRealTimers();
  });
});

describe('historyService.getRecentMistakes', () => {
  it('maps attempt rows into MistakeEntry shape', () => {
    mockGetAllSync.mockReturnValue([
      {
        id: 'attempt-1',
        session_id: 'session-1',
        challenge_type: 'QUIZ',
        tag: 'historia',
        prompt_text: 'Quando foi a independência?',
        explanation_text: '1822.',
        answered_at: 123,
      },
    ]);

    const result = historyService.getRecentMistakes('user-1', 5);

    expect(result).toEqual([
      {
        id: 'attempt-1',
        sessionId: 'session-1',
        challengeType: 'QUIZ',
        tag: 'historia',
        promptText: 'Quando foi a independência?',
        explanationText: '1822.',
        answeredAt: 123,
      },
    ]);
  });
});

describe('historyService.startSession / completeSession', () => {
  it('inserts a new session row with the generated id and returns that id', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T12:00:00Z'));

    const id = historyService.startSession({
      userId: 'user-1',
      schedulerId: 'sched-1',
      schedulerName: 'Revisão',
      totalChallenges: 3,
    });

    expect(id).toBe('generated-id');
    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO sessions'),
      ['generated-id', 'user-1', 'sched-1', 'Revisão', new Date('2026-03-11T12:00:00Z').getTime(), 3]
    );

    jest.useRealTimers();
  });

  it('marks a session complete by id with the current timestamp', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T12:00:00Z'));

    historyService.completeSession('session-1');

    expect(mockRunSync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sessions'),
      [new Date('2026-03-11T12:00:00Z').getTime(), 'session-1']
    );

    jest.useRealTimers();
  });
});

describe('historyService.recordAttempt', () => {
  it('serializes options to JSON and normalizes isCorrect to 1/0/null', () => {
    historyService.recordAttempt({
      sessionId: 'session-1',
      userId: 'user-1',
      challengeType: 'QUIZ',
      tag: 'historia',
      language: 'pt',
      difficulty: 'medium',
      promptText: 'Pergunta?',
      explanationText: 'Explicação.',
      options: [{ id: 'a1', text: 'Certo', correct: true }],
      isCorrect: true,
      wrongAttempts: 1,
      timeSpentMs: 5000,
      sourceObjectKey: 'obj-1',
      sourcePage: 2,
    });

    const [, params] = mockRunSync.mock.calls[0];
    expect(params[9]).toBe(JSON.stringify([{ id: 'a1', text: 'Certo', correct: true }])); // options_json
    expect(params[10]).toBe(1); // is_correct
  });

  it('stores a null options_json for flashcards (no options) and null is_correct when ungraded', () => {
    historyService.recordAttempt({
      sessionId: 'session-1',
      userId: 'user-1',
      challengeType: 'FLASHCARD',
      tag: 'ingles',
      language: 'en',
      difficulty: null,
      promptText: 'Título',
      explanationText: 'Conteúdo',
      options: null,
      isCorrect: null,
      wrongAttempts: 0,
      timeSpentMs: null,
      sourceObjectKey: null,
      sourcePage: null,
    });

    const [, params] = mockRunSync.mock.calls[0];
    expect(params[9]).toBeNull(); // options_json
    expect(params[10]).toBeNull(); // is_correct
  });

  it('maps isCorrect=false to 0, not null (0 is falsy but still a real answer)', () => {
    historyService.recordAttempt({
      sessionId: 'session-1',
      userId: 'user-1',
      challengeType: 'TRUE_FALSE',
      tag: 'ciencias',
      language: 'pt',
      difficulty: 'easy',
      promptText: 'Afirmação',
      explanationText: null,
      options: null,
      isCorrect: false,
      wrongAttempts: 2,
      timeSpentMs: 1000,
      sourceObjectKey: null,
      sourcePage: null,
    });

    const [, params] = mockRunSync.mock.calls[0];
    expect(params[10]).toBe(0);
  });
});

describe('historyService.getSessions', () => {
  it('maps session rows into SessionSummary shape', () => {
    mockGetAllSync.mockReturnValue([
      {
        id: 'session-1',
        scheduler_id: 'sched-1',
        scheduler_name: 'Revisão',
        started_at: 100,
        completed_at: 200,
        total_challenges: 5,
        answered_count: 5,
        correct_count: 4,
      },
    ]);

    const result = historyService.getSessions('user-1', 10);

    expect(result).toEqual([
      {
        id: 'session-1',
        schedulerId: 'sched-1',
        schedulerName: 'Revisão',
        startedAt: 100,
        completedAt: 200,
        totalChallenges: 5,
        answeredCount: 5,
        correctCount: 4,
      },
    ]);
  });
});

describe('historyService.getSessionDetail', () => {
  it('returns undefined when the session does not exist, without querying attempts', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = historyService.getSessionDetail('missing');

    expect(result).toBeUndefined();
    expect(mockGetAllSync).not.toHaveBeenCalled();
  });

  it('derives answeredCount/correctCount from the actual attempts, not the session row', () => {
    mockGetFirstSync.mockReturnValue({
      id: 'session-1',
      scheduler_id: 'sched-1',
      scheduler_name: 'Revisão',
      started_at: 100,
      completed_at: 200,
      total_challenges: 5,
    });
    mockGetAllSync.mockReturnValue([
      { id: 'a1', session_id: 'session-1', is_correct: 1, answered_at: 1, challenge_type: 'QUIZ', tag: 't', language: 'pt', difficulty: null, prompt_text: 'p', explanation_text: null, options_json: null, wrong_attempts: 0, time_spent_ms: null, source_object_key: null, source_page: null },
      { id: 'a2', session_id: 'session-1', is_correct: 0, answered_at: 2, challenge_type: 'QUIZ', tag: 't', language: 'pt', difficulty: null, prompt_text: 'p', explanation_text: null, options_json: null, wrong_attempts: 1, time_spent_ms: null, source_object_key: null, source_page: null },
    ]);

    const result = historyService.getSessionDetail('session-1');

    expect(result?.answeredCount).toBe(2);
    expect(result?.correctCount).toBe(1);
    expect(result?.attempts).toHaveLength(2);
  });
});

describe('historyService.getAttemptDetail', () => {
  it('returns undefined when the attempt does not exist', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    expect(historyService.getAttemptDetail('missing')).toBeUndefined();
  });

  it('attaches the scheduler name from the joined row', () => {
    mockGetFirstSync.mockReturnValue({
      id: 'a1',
      session_id: 's1',
      challenge_type: 'QUIZ',
      tag: 't',
      language: 'pt',
      difficulty: null,
      prompt_text: 'p',
      explanation_text: null,
      options_json: null,
      is_correct: 1,
      wrong_attempts: 0,
      answered_at: 1,
      time_spent_ms: null,
      source_object_key: null,
      source_page: null,
      scheduler_name: 'Revisão de Inglês',
    });

    const result = historyService.getAttemptDetail('a1');

    expect(result?.schedulerName).toBe('Revisão de Inglês');
    expect(result?.isCorrect).toBe(true);
  });
});

describe('historyService.getTagDetail', () => {
  it('defaults to zeroed-out stats when the tag has no attempts yet', () => {
    mockGetFirstSync.mockReturnValue(undefined);
    mockGetAllSync.mockReturnValue([]);

    const result = historyService.getTagDetail('user-1', 'novo-assunto');

    expect(result.stat).toEqual({ tag: 'novo-assunto', total: 0, accuracy: null, hasEnoughData: false });
    expect(result.recentAttempts).toEqual([]);
  });
});

describe('historyService.exportAll', () => {
  it('bundles every session and attempt row for the user with an export timestamp', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-11T12:00:00Z'));
    mockGetAllSync.mockReturnValueOnce([{ id: 'session-1' }]).mockReturnValueOnce([{ id: 'attempt-1' }]);

    const result = historyService.exportAll('user-1');

    expect(result).toEqual({
      exportedAt: new Date('2026-03-11T12:00:00Z').getTime(),
      sessions: [{ id: 'session-1' }],
      attempts: [{ id: 'attempt-1' }],
    });

    jest.useRealTimers();
  });
});

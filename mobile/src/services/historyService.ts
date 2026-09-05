// src/services/historyService.ts

import { db, generateId } from '@/db/client';
import {
  AttemptDetail,
  AttemptEntry,
  ChallengeType,
  MistakeEntry,
  RecordAttemptInput,
  ReviewOption,
  SessionDetail,
  SessionSummary,
  TagDetail,
  TagStat,
} from '@/types/domain/History';

// Tags com menos respostas que isso ficam separadas como "ainda pouco dado" -- uma tag
// respondida 1 vez e errada mostraria 0% de acerto, o que é enganoso, não um insight real.
const MIN_ATTEMPTS_FOR_INSIGHT = 3;

interface AttemptRow {
  id: string;
  session_id: string;
  challenge_type: ChallengeType;
  tag: string;
  language: string;
  difficulty: string | null;
  prompt_text: string;
  explanation_text: string | null;
  options_json: string | null;
  is_correct: number | null;
  wrong_attempts: number;
  answered_at: number;
  time_spent_ms: number | null;
  source_object_key: string | null;
  source_page: number | null;
}

function parseOptions(json: string | null): ReviewOption[] | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ReviewOption[];
  } catch (err) {
    console.warn('[historyService] Falha ao ler options_json, ignorando', err);
    return null;
  }
}

function mapAttemptRow(row: AttemptRow): AttemptEntry {
  return {
    id: row.id,
    sessionId: row.session_id,
    challengeType: row.challenge_type,
    tag: row.tag,
    language: row.language,
    difficulty: row.difficulty,
    promptText: row.prompt_text,
    explanationText: row.explanation_text,
    options: parseOptions(row.options_json),
    isCorrect: row.is_correct === null ? null : row.is_correct === 1,
    wrongAttempts: row.wrong_attempts,
    answeredAt: row.answered_at,
    timeSpentMs: row.time_spent_ms,
    sourceObjectKey: row.source_object_key,
    sourcePage: row.source_page,
  };
}

export const historyService = {
  startSession(input: {
    userId: string;
    schedulerId: string;
    schedulerName: string;
    totalChallenges: number;
  }): string {
    const id = generateId();
    db.runSync(
      `INSERT INTO sessions (id, user_id, scheduler_id, scheduler_name, started_at, completed_at, total_challenges)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      [id, input.userId, input.schedulerId, input.schedulerName, Date.now(), input.totalChallenges]
    );
    return id;
  },

  completeSession(sessionId: string): void {
    db.runSync('UPDATE sessions SET completed_at = ? WHERE id = ?', [Date.now(), sessionId]);
  },

  recordAttempt(input: RecordAttemptInput): void {
    db.runSync(
      `INSERT INTO attempts (
         id, session_id, user_id, challenge_type, tag, language, difficulty,
         prompt_text, explanation_text, options_json, is_correct, wrong_attempts, answered_at,
         time_spent_ms, source_object_key, source_page
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        input.sessionId,
        input.userId,
        input.challengeType,
        input.tag,
        input.language,
        input.difficulty,
        input.promptText,
        input.explanationText,
        input.options ? JSON.stringify(input.options) : null,
        input.isCorrect === null ? null : input.isCorrect ? 1 : 0,
        input.wrongAttempts,
        Date.now(),
        input.timeSpentMs,
        input.sourceObjectKey,
        input.sourcePage,
      ]
    );
  },

  getTagBreakdown(userId: string): TagStat[] {
    const rows = db.getAllSync<{ tag: string; total: number; correct: number; graded: number }>(
      `SELECT tag, COUNT(*) as total,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
              SUM(CASE WHEN is_correct IS NOT NULL THEN 1 ELSE 0 END) as graded
       FROM attempts WHERE user_id = ? GROUP BY tag`,
      [userId]
    );

    return rows
      .map(
        (r): TagStat => ({
          tag: r.tag,
          total: r.total,
          accuracy: r.graded > 0 ? r.correct / r.graded : null,
          hasEnoughData: r.total >= MIN_ATTEMPTS_FOR_INSIGHT,
        })
      )
      .sort((a, b) => {
        if (a.hasEnoughData !== b.hasEnoughData) return a.hasEnoughData ? -1 : 1;
        if (a.accuracy === null || b.accuracy === null) return 0;
        return a.accuracy - b.accuracy;
      });
  },

  // "Erro" aqui é acertar só na segunda tentativa (ou depois) -- os componentes de desafio
  // bloqueiam avanço até acertar, então nunca existe uma resposta final errada de fato.
  getRecentMistakes(userId: string, limit = 10): MistakeEntry[] {
    const rows = db.getAllSync<AttemptRow>(
      `SELECT * FROM attempts WHERE user_id = ? AND is_correct = 0
       ORDER BY answered_at DESC LIMIT ?`,
      [userId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      challengeType: r.challenge_type,
      tag: r.tag,
      promptText: r.prompt_text,
      explanationText: r.explanation_text,
      answeredAt: r.answered_at,
    }));
  },

  getSessions(userId: string, limit = 20): SessionSummary[] {
    const rows = db.getAllSync<{
      id: string;
      scheduler_id: string;
      scheduler_name: string;
      started_at: number;
      completed_at: number | null;
      total_challenges: number;
      answered_count: number;
      correct_count: number;
    }>(
      `SELECT s.id, s.scheduler_id, s.scheduler_name, s.started_at, s.completed_at, s.total_challenges,
              COUNT(a.id) as answered_count,
              SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
       FROM sessions s
       LEFT JOIN attempts a ON a.session_id = s.id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.started_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      schedulerId: r.scheduler_id,
      schedulerName: r.scheduler_name,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      totalChallenges: r.total_challenges,
      answeredCount: r.answered_count,
      correctCount: r.correct_count,
    }));
  },

  getSessionDetail(sessionId: string): SessionDetail | undefined {
    const session = db.getFirstSync<{
      id: string;
      scheduler_id: string;
      scheduler_name: string;
      started_at: number;
      completed_at: number | null;
      total_challenges: number;
    }>('SELECT id, scheduler_id, scheduler_name, started_at, completed_at, total_challenges FROM sessions WHERE id = ?', [
      sessionId,
    ]);
    if (!session) return undefined;

    const attemptRows = db.getAllSync<AttemptRow>('SELECT * FROM attempts WHERE session_id = ? ORDER BY answered_at ASC', [
      sessionId,
    ]);
    const attempts = attemptRows.map(mapAttemptRow);

    return {
      id: session.id,
      schedulerId: session.scheduler_id,
      schedulerName: session.scheduler_name,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      totalChallenges: session.total_challenges,
      answeredCount: attempts.length,
      correctCount: attempts.filter((a) => a.isCorrect === true).length,
      attempts,
    };
  },

  // Pra tela de revisão (abrir um desafio já respondido de dentro da sessão ou do assunto)
  // mostrar o desafio original de novo -- pergunta/alternativas/explicação -- em vez de só
  // o texto solto.
  getAttemptDetail(attemptId: string): AttemptDetail | undefined {
    const row = db.getFirstSync<AttemptRow & { scheduler_name: string }>(
      `SELECT a.*, s.scheduler_name
       FROM attempts a
       JOIN sessions s ON s.id = a.session_id
       WHERE a.id = ?`,
      [attemptId]
    );
    if (!row) return undefined;

    return { ...mapAttemptRow(row), schedulerName: row.scheduler_name };
  },

  getTagDetail(userId: string, tag: string): TagDetail {
    const statRow = db.getFirstSync<{ total: number; correct: number; graded: number }>(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
              SUM(CASE WHEN is_correct IS NOT NULL THEN 1 ELSE 0 END) as graded
       FROM attempts WHERE user_id = ? AND tag = ?`,
      [userId, tag]
    );
    const total = statRow?.total ?? 0;
    const graded = statRow?.graded ?? 0;
    const correct = statRow?.correct ?? 0;

    const stat: TagStat = {
      tag,
      total,
      accuracy: graded > 0 ? correct / graded : null,
      hasEnoughData: total >= MIN_ATTEMPTS_FOR_INSIGHT,
    };

    const recentRows = db.getAllSync<AttemptRow>(
      'SELECT * FROM attempts WHERE user_id = ? AND tag = ? ORDER BY answered_at DESC LIMIT 20',
      [userId, tag]
    );

    return {
      tag,
      stat,
      recentAttempts: recentRows.map(mapAttemptRow),
    };
  },

  // Não faz upload nenhum -- é só o gancho que deixa a porta aberta pra um backup em S3
  // futuro, sem construir esse fluxo agora.
  exportAll(userId: string) {
    const sessions = db.getAllSync('SELECT * FROM sessions WHERE user_id = ?', [userId]);
    const attempts = db.getAllSync('SELECT * FROM attempts WHERE user_id = ?', [userId]);
    return { exportedAt: Date.now(), sessions, attempts };
  },
};

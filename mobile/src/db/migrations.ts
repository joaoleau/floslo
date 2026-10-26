// src/db/migrations.ts

import { SQLiteDatabase } from 'expo-sqlite';

interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => void;
}

// Enquanto o app está em desenvolvimento, o esquema pode mudar direto aqui e o banco local é
// recriado reinstalando o app. Depois de publicado, as migrações passam a ser só aditivas:
// o histórico local não tem fallback de servidor, e uma migração malfeita perde dado de vez.
const migrations: Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.execSync(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          scheduler_id TEXT NOT NULL,
          scheduler_name TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          completed_at INTEGER,
          total_challenges INTEGER NOT NULL
        );

        CREATE TABLE attempts (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL REFERENCES sessions(id),
          user_id TEXT NOT NULL,
          challenge_type TEXT NOT NULL,
          tag TEXT NOT NULL,
          language TEXT NOT NULL,
          prompt_text TEXT NOT NULL,
          explanation_text TEXT,
          is_correct INTEGER,
          wrong_attempts INTEGER NOT NULL DEFAULT 0,
          answered_at INTEGER NOT NULL,
          source_object_key TEXT,
          source_page INTEGER
        );

        CREATE INDEX idx_attempts_user_answered ON attempts(user_id, answered_at);
        CREATE INDEX idx_attempts_tag ON attempts(user_id, tag);
        CREATE INDEX idx_attempts_session ON attempts(session_id);
        CREATE INDEX idx_sessions_user ON sessions(user_id, started_at);
      `);
    },
  },
  {
    version: 2,
    up: (db) => {
      // Guarda as alternativas (Múltipla escolha) / opções fixas Verdadeiro-Falso como JSON, pra tela
      // de revisão de sessão poder mostrar o desafio original de novo (com a correta
      // destacada), não só o texto da pergunta.
      db.execSync('ALTER TABLE attempts ADD COLUMN options_json TEXT');
    },
  },
];

export function runMigrations(db: SQLiteDatabase): void {
  const { user_version: currentVersion } = db.getFirstSync<{ user_version: number }>(
    'PRAGMA user_version'
  )!;

  const pending = migrations.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);
  if (pending.length === 0) return;

  db.withTransactionSync(() => {
    for (const migration of pending) {
      console.log(`[DB] Aplicando migração v${migration.version}`);
      migration.up(db);
      db.execSync(`PRAGMA user_version = ${migration.version}`);
    }
  });
}

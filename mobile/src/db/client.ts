import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from './migrations';

export const db = openDatabaseSync('floslo_history.db');

runMigrations(db);
pruneOldData(db);

export const HISTORY_RETENTION_DAYS = 30;

function pruneOldData(database: ReturnType<typeof openDatabaseSync>): void {
  const cutoff = Date.now() - HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  database.withTransactionSync(() => {
    database.runSync('DELETE FROM attempts WHERE answered_at < ?', [cutoff]);
    database.runSync(
      'DELETE FROM sessions WHERE started_at < ? AND id NOT IN (SELECT DISTINCT session_id FROM attempts)',
      [cutoff]
    );
  });
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

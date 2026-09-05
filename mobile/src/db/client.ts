// src/db/client.ts

import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from './migrations';

// Aberto e migrado uma única vez no import deste módulo -- tanto o firing.tsx (gravando)
// quanto a tela de Histórico (lendo) importam historyService, que importa daqui, então o
// schema já está pronto antes de qualquer consumidor rodar, sem depender de um efeito de
// boot separado no _layout.tsx.
export const db = openDatabaseSync('floslo_history.db');

runMigrations(db);
pruneOldData(db);

// Histórico é só uma janela recente pra insight, não um arquivo permanente -- dado mais
// velho que isso nem deve continuar ocupando espaço no aparelho. Roda uma vez por boot do
// app (junto da migração, no import deste módulo), não a cada escrita.
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

// Só precisa ser única como chave primária local, não criptograficamente aleatória --
// evita puxar expo-crypto/uuid só pra isso.
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

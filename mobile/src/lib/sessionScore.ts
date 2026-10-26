import { SessionSummary } from '@/types/domain/History';
import { i18n } from '@/i18n';

/**
 * Resumo do desempenho de uma sessão no Histórico. O placar "x/y de primeira" conta só as
 * perguntas que têm certo ou errado (Múltipla escolha e Verdadeiro ou Falso); as Descobertas
 * não têm acerto e aparecem à parte, para uma sessão com 2 perguntas e 4 Descobertas mostrar
 * "2/2 de primeira • 4 descobertas", e não "2/6".
 */
export function sessionScoreLabel(session: Pick<SessionSummary, 'answeredCount' | 'gradedCount' | 'correctCount'>): string {
  const discoveries = session.answeredCount - session.gradedCount;
  const parts: string[] = [];
  if (session.gradedCount > 0) {
    parts.push(i18n.t('history.score.firstTry', { correct: session.correctCount, graded: session.gradedCount }));
  }
  if (discoveries > 0) parts.push(i18n.t('history.score.discoveries', { count: discoveries }));
  return parts.length > 0 ? parts.join(' • ') : i18n.t('history.score.none');
}

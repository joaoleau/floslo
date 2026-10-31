import { SessionSummary } from '@/types/domain/History';
import { i18n } from '@/i18n';

export function sessionScoreLabel(session: Pick<SessionSummary, 'answeredCount' | 'gradedCount' | 'correctCount'>): string {
  const discoveries = session.answeredCount - session.gradedCount;
  const parts: string[] = [];
  if (session.gradedCount > 0) {
    parts.push(i18n.t('history.score.firstTry', { correct: session.correctCount, graded: session.gradedCount }));
  }
  if (discoveries > 0) parts.push(i18n.t('history.score.discoveries', { count: discoveries }));
  return parts.length > 0 ? parts.join(' • ') : i18n.t('history.score.none');
}

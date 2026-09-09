// src/hooks/useHistory.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { historyService } from '@/services/historyService';
import { userStatsApi } from '@/api/userStats';
import { useMeQuery } from '@/hooks/useUser';
import { useSchedulersQuery } from '@/hooks/useSchedulers';
import { useObjectsQuery } from '@/hooks/useObjects';
import { ChallengeType } from '@/types/domain/History';
import { UserStats } from '@/types/domain/UserStats';

const EMPTY_ANSWERED_BY_TYPE: Record<ChallengeType, number> = { QUIZ: 0, FLASHCARD: 0, TRUE_FALSE: 0 };

// Combina o agregado do backend (streak + respondidos por tipo) com a contagem de
// schedulers/objetos, que já vem de graça das queries que essas telas já usam --
// não existe (nem precisa existir) um endpoint dedicado só pra contagem.
export function useUserStatsQuery() {
  const statsQuery = useQuery({
    queryKey: queryKeys.userStats.me,
    queryFn: () => userStatsApi.getStats(),
  });
  const schedulersQuery = useSchedulersQuery();
  const objectsQuery = useObjectsQuery();

  const isPending = statsQuery.isPending || schedulersQuery.isPending || objectsQuery.isPending;
  const isError = statsQuery.isError || schedulersQuery.isError || objectsQuery.isError;

  const data: UserStats | undefined =
    !isPending && !isError
      ? {
          streakDays: statsQuery.data!.current_streak,
          answeredByType: { ...EMPTY_ANSWERED_BY_TYPE, ...statsQuery.data!.answered_by_type },
          schedulerCount: schedulersQuery.data!.length,
          objectCount: objectsQuery.data!.length,
        }
      : undefined;

  function refetch() {
    statsQuery.refetch();
    schedulersQuery.refetch();
    objectsQuery.refetch();
  }

  return { data, isPending, isError, refetch };
}

export function useTagBreakdownQuery() {
  const { data: user } = useMeQuery();
  return useQuery({
    queryKey: queryKeys.history.tags(user?.id ?? ''),
    queryFn: () => historyService.getTagBreakdown(user!.id),
    enabled: !!user,
  });
}

export function useTagDetailQuery(tag: string) {
  const { data: user } = useMeQuery();
  return useQuery({
    queryKey: queryKeys.history.tagDetail(user?.id ?? '', tag),
    queryFn: () => historyService.getTagDetail(user!.id, tag),
    enabled: !!user && !!tag,
  });
}

export function useRecentMistakesQuery(limit = 10) {
  const { data: user } = useMeQuery();
  return useQuery({
    queryKey: queryKeys.history.mistakes(user?.id ?? ''),
    queryFn: () => historyService.getRecentMistakes(user!.id, limit),
    enabled: !!user,
  });
}

export function useStudyActivityQuery(days = 84) {
  const { data: user } = useMeQuery();
  return useQuery({
    queryKey: queryKeys.history.dailyActivity(user?.id ?? '', days),
    queryFn: () => historyService.getDailyActivity(user!.id, days),
    enabled: !!user,
  });
}

export function useSessionsQuery(limit = 20) {
  const { data: user } = useMeQuery();
  return useQuery({
    queryKey: queryKeys.history.sessions(user?.id ?? ''),
    queryFn: () => historyService.getSessions(user!.id, limit),
    enabled: !!user,
  });
}

export function useSessionDetailQuery(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.history.sessionDetail(sessionId),
    queryFn: () => historyService.getSessionDetail(sessionId),
    enabled: !!sessionId,
  });
}

export function useAttemptDetailQuery(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.history.attemptDetail(attemptId),
    queryFn: () => historyService.getAttemptDetail(attemptId),
    enabled: !!attemptId,
  });
}

// Chamado depois que uma sessão de alarme termina de gravar no SQLite, pra tela de
// Histórico buscar dado fresco na próxima vez que for aberta (o SQLite não emite eventos
// de mudança sozinho, diferente de uma query de rede que o React Query já invalida via
// mutation).
export function useInvalidateHistory() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['history'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.userStats.me });
  };
}

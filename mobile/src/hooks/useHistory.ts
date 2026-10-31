import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { historyService } from '@/services/historyService';
import { useMeQuery } from '@/hooks/useUser';

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

export function useInvalidateHistory() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['history'] });
  };
}

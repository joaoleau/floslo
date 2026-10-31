import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { firingService } from '@/services/firingService';

export function useRagQuery(schedulerId: string) {
  return useQuery({
    queryKey: queryKeys.rag.bySchedulerId(schedulerId),
    queryFn: () => firingService.getBySchedulerId(schedulerId),
    enabled: !!schedulerId,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

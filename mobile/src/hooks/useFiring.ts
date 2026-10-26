import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { firingService } from '@/services/firingService';

// Cada disparo gera os seus desafios uma vez só. Sem cache entre disparos (gcTime 0), um novo
// disparo do mesmo agendador nunca começa com os desafios do anterior; e sem refetch durante o
// disparo (staleTime infinito, sem refetch ao voltar o foco ou a rede), os desafios não são
// trocados no meio das respostas. "Tentar novamente" chama refetch() de forma explícita.
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

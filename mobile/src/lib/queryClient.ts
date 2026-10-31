import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      console.error(`[Query] falhou: ${JSON.stringify(query.queryKey)}`, error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      console.error(`[Mutation] falhou: ${mutation.options.mutationKey ? JSON.stringify(mutation.options.mutationKey) : '(sem key)'}`, error);
    },
  }),
});

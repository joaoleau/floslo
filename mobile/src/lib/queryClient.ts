import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query';

// Centralized net for every query/mutation failure in the app — including ones whose
// screen-level catch block only shows an Alert without logging anything. Without this,
// a failure deep in a hook (e.g. a background refetch) can happen with zero terminal output.
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

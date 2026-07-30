import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { schedulerService } from '@/services/schedulerService';
import { Scheduler } from '@/types/domain/Scheduler';

export function useSchedulersQuery() {
  return useQuery({ queryKey: queryKeys.schedulers.all, queryFn: schedulerService.getAll });
}

export function useSchedulerQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.schedulers.detail(id),
    queryFn: () => schedulerService.getById(id),
    enabled: !!id,
  });
}

export function useCreateSchedulerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduler: Scheduler) => schedulerService.create(scheduler),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.schedulers.all }),
  });
}

export function useUpdateSchedulerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduler }: { id: string; scheduler: Scheduler }) => schedulerService.update(id, scheduler),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedulers.all });
      qc.invalidateQueries({ queryKey: queryKeys.schedulers.detail(id) });
    },
  });
}

export function useDeleteSchedulerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schedulerService.deleteScheduler(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.schedulers.all });
      qc.removeQueries({ queryKey: queryKeys.schedulers.detail(id) });
    },
  });
}

// Optimistic toggle: flips the switch immediately, rolls back on failure.
export function useToggleSchedulerMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => schedulerService.toggleStatus(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await qc.cancelQueries({ queryKey: queryKeys.schedulers.all });
      const previous = qc.getQueryData<Scheduler[]>(queryKeys.schedulers.all);
      qc.setQueryData<Scheduler[]>(queryKeys.schedulers.all, (old) =>
        old?.map((s) => (s.id === id ? { ...s, enabled } : s))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.schedulers.all, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.schedulers.all }),
  });
}

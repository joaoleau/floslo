import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { objectService } from '@/services/objectService';

// Polls only while at least one object is still "processing" (e.g. right after an
// upload), so the list picks up the "active"/"failed" transition without the user
// having to pull-to-refresh. Stops as soon as nothing is pending.
const PROCESSING_POLL_INTERVAL_MS = 5000;

export function useObjectsQuery() {
  return useQuery({
    queryKey: queryKeys.objects.all,
    queryFn: objectService.getAll,
    refetchInterval: (query) =>
      query.state.data?.some((object) => object.status === 'processing') ? PROCESSING_POLL_INTERVAL_MS : false,
  });
}

export function useObjectQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.objects.detail(id),
    queryFn: () => objectService.getById(id),
    enabled: !!id,
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? PROCESSING_POLL_INTERVAL_MS : false),
  });
}

export function useUpdateObjectTagsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) => objectService.update(id, tags),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.objects.all });
      qc.invalidateQueries({ queryKey: queryKeys.objects.detail(id) });
    },
  });
}

export function useDeleteObjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => objectService.deleteObject(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.objects.all });
      qc.removeQueries({ queryKey: queryKeys.objects.detail(id) });
    },
  });
}

export function useUploadObjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType?: string }) => objectService.upload(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.objects.all }),
  });
}

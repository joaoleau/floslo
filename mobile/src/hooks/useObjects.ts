import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { objectService } from '@/services/objectService';
import { ObjectType } from '@/types/domain/Object';

const PROCESSING_POLL_INTERVAL_MS = 5000;

const UPLOAD_APPEARANCE_TIMEOUT_MS = 2 * 60 * 1000;

interface PendingUpload {
  knownIds: Set<string>;
  sentAt: number;
}

let pendingUploads: PendingUpload[] = [];

export function trackUpload(currentObjects: ObjectType[] | undefined, now: number = Date.now()): void {
  pendingUploads.push({ knownIds: new Set((currentObjects ?? []).map((object) => object.id)), sentAt: now });
}

export function isWaitingForUpload(objects: ObjectType[] | undefined, now: number = Date.now()): boolean {
  const ids = (objects ?? []).map((object) => object.id);
  pendingUploads = pendingUploads.filter(
    (upload) => now - upload.sentAt < UPLOAD_APPEARANCE_TIMEOUT_MS && !ids.some((id) => !upload.knownIds.has(id))
  );
  return pendingUploads.length > 0;
}

export function resetPendingUploads(): void {
  pendingUploads = [];
}

export function useObjectsQuery() {
  return useQuery({
    queryKey: queryKeys.objects.all,
    queryFn: objectService.getAll,
    refetchInterval: (query) =>
      query.state.data?.some((object) => object.status === 'processing') || isWaitingForUpload(query.state.data)
        ? PROCESSING_POLL_INTERVAL_MS
        : false,
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

export function useRenameObjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => objectService.rename(id, name),
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
    onSuccess: () => {
      trackUpload(qc.getQueryData<ObjectType[]>(queryKeys.objects.all));
      return qc.invalidateQueries({ queryKey: queryKeys.objects.all });
    },
  });
}

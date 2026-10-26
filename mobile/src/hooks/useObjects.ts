import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { objectService } from '@/services/objectService';
import { ObjectType } from '@/types/domain/Object';

// Polls only while at least one object is still "processing", so the list picks up the
// "active"/"failed" transition without the user having to pull-to-refresh, and while an
// upload has not shown up in the list yet. Stops as soon as nothing is pending.
const PROCESSING_POLL_INTERVAL_MS = 5000;

// O registro do documento ("processando") não nasce no envio: quem o cria é a
// floslo-object-processor, depois que o S3 avisa a fila SQS (que junta mensagens por até 10 s)
// e a Lambda inicia. Logo depois do envio a lista ainda não tem o documento, e sem nenhum
// "processando" o polling acima não começaria. Por isso cada envio fica pendente até aparecer
// um documento novo na lista, por no máximo este tempo.
const UPLOAD_APPEARANCE_TIMEOUT_MS = 2 * 60 * 1000;

interface PendingUpload {
  knownIds: Set<string>;
  sentAt: number;
}

let pendingUploads: PendingUpload[] = [];

/** Registra um envio, com os documentos que a lista já tinha nesse momento. */
export function trackUpload(currentObjects: ObjectType[] | undefined, now: number = Date.now()): void {
  pendingUploads.push({ knownIds: new Set((currentObjects ?? []).map((object) => object.id)), sentAt: now });
}

/**
 * Diz se algum envio ainda não apareceu na lista. Um envio sai da espera quando surge na lista
 * um documento que ela não tinha no momento do envio, ou depois de UPLOAD_APPEARANCE_TIMEOUT_MS.
 */
export function isWaitingForUpload(objects: ObjectType[] | undefined, now: number = Date.now()): boolean {
  const ids = (objects ?? []).map((object) => object.id);
  pendingUploads = pendingUploads.filter(
    (upload) => now - upload.sentAt < UPLOAD_APPEARANCE_TIMEOUT_MS && !ids.some((id) => !upload.knownIds.has(id))
  );
  return pendingUploads.length > 0;
}

/** Só para os testes. */
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

import { ListObjectFilenamesResponseDTO, ObjectRequestDTO, PresignObjectDTO, PresignUploadDTO } from '@/types/api/StorageDTO';
import { api } from './http/client';

export const storageApi = {
  list() {
    return api.get<ListObjectFilenamesResponseDTO>('/api/storage/list');
  },

  getUploadUrl(objectName: string) {
    const body: ObjectRequestDTO = { object_name: objectName };
    return api.post<PresignUploadDTO>('/api/storage/upload', body);
  },

  getDownloadUrl(objectName: string) {
    const body: ObjectRequestDTO = { object_name: objectName };
    return api.post<PresignObjectDTO>('/api/storage/download', body);
  },

  deleteObject(objectName: string) {
    const body: ObjectRequestDTO = { object_name: objectName };
    return api.delete<{ message: string }>('/api/storage/delete', body);
  },

  async uploadFileToPresignedUrl(presign: PresignUploadDTO, fileUri: string, mimeType?: string): Promise<void> {
    const fileResponse = await fetch(fileUri);
    const blob = await fileResponse.blob();

    const formData = new FormData();
    for (const [key, value] of Object.entries(presign.fields ?? {})) {
      formData.append(key, value);
    }
    if (mimeType) {
      formData.append('Content-Type', mimeType);
    }
    formData.append('file', blob);

    console.log(`[storage] -> POST (S3 presigned) upload de arquivo`);

    let res: Response;
    try {
      res = await fetch(presign.url, {
        method: 'POST',
        body: formData,
      });
    } catch (networkErr) {
      console.error('[storage] Erro de rede ao enviar arquivo pro S3', networkErr);
      throw networkErr;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[storage] <- ${res.status} upload S3 falhou`, body);
      throw new Error(`Upload failed with status ${res.status}: ${body}`);
    }

    console.log(`[storage] <- ${res.status} upload S3 concluído`);
  },
};

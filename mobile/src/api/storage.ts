import { ListObjectFilenamesResponseDTO, ObjectRequestDTO, PresignObjectDTO } from '@/types/api/StorageDTO';
import { api } from './http/client';

export const storageApi = {
  list() {
    return api.get<ListObjectFilenamesResponseDTO>('/api/storage/list');
  },

  getUploadUrl(objectName: string) {
    const body: ObjectRequestDTO = { object_name: objectName };
    return api.post<PresignObjectDTO>('/api/storage/upload', body);
  },

  getDownloadUrl(objectName: string) {
    const body: ObjectRequestDTO = { object_name: objectName };
    return api.post<PresignObjectDTO>('/api/storage/download', body);
  },

  deleteObject(objectName: string) {
    const body: ObjectRequestDTO = { object_name: objectName };
    return api.delete<{ message: string }>('/api/storage/delete', body);
  },

  /**
   * Uploads a locally-picked file straight to S3 using a presigned URL.
   * This deliberately bypasses api/http/client.ts: it's a pre-signed,
   * anonymous, non-JSON PUT (raw file bytes), not a call to our API.
   */
  async uploadFileToPresignedUrl(presign: PresignObjectDTO, fileUri: string, mimeType?: string): Promise<void> {
    const fileResponse = await fetch(fileUri);
    const blob = await fileResponse.blob();

    const headers: Record<string, string> = {};
    for (const [key, values] of Object.entries(presign.signed_header ?? {})) {
      headers[key] = Array.isArray(values) ? values.join(',') : String(values);
    }
    if (mimeType && !('Content-Type' in headers)) {
      headers['Content-Type'] = mimeType;
    }

    const res = await fetch(presign.url, {
      method: presign.method,
      headers,
      body: blob,
    });

    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
  },
};

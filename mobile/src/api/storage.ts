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

  /**
   * Uploads a locally-picked file straight to S3 using a presigned POST.
   * This deliberately bypasses api/http/client.ts: it's a pre-signed,
   * anonymous, multipart/form-data POST, not a call to our API.
   *
   * Presigned POST (not PUT) is what lets S3 enforce the upload size limit
   * (content-length-range, set server-side when the URL is signed) and
   * reject an oversized file before accepting any bytes -- the `file`
   * field must be appended last, after every other field from `presign.fields`,
   * per S3's POST policy requirements.
   */
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

    const res = await fetch(presign.url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Upload failed with status ${res.status}: ${body}`);
    }
  },
};

import { objectsApi } from '@/api/objects';
import { storageApi } from '@/api/storage';
import { objectMapper } from '@/mappers/objectMapper';
import { ObjectType } from '@/types/domain/Object';

export const objectService = {
  async getAll(): Promise<ObjectType[]> {
    const { objects } = await objectsApi.list();
    return objects.map(objectMapper.toDomain);
  },

  async getById(id: string): Promise<ObjectType | undefined> {
    try {
      const raw = await objectsApi.getById(id);
      return objectMapper.toDomain(raw);
    } catch {
      return undefined;
    }
  },

  async update(id: string, tags: string[]): Promise<ObjectType> {
    const updated = await objectsApi.updateTags(id, tags);
    return objectMapper.toDomain(updated);
  },

  async deleteObject(id: string): Promise<void> {
    // Cascades server-side: S3 file, S3 Vectors embeddings, scheduler links and the
    // DynamoDB record. Do not fall back to storageApi.deleteObject — that only
    // removes the S3 file and leaves the rest orphaned.
    await objectsApi.remove(id);
  },

  async upload(file: { uri: string; name: string; mimeType?: string }): Promise<void> {
    const presign = await storageApi.getUploadUrl(file.name);
    await storageApi.uploadFileToPresignedUrl(presign, file.uri, file.mimeType);
  },
};

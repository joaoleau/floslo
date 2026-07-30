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
    // The storage-delete endpoint keys off the original S3 filename, not the
    // object's DynamoDB id, so look it up first.
    const raw = await objectsApi.getById(id);
    await storageApi.deleteObject(raw.name);
  },

  async upload(file: { uri: string; name: string; mimeType?: string }): Promise<void> {
    const presign = await storageApi.getUploadUrl(file.name);
    await storageApi.uploadFileToPresignedUrl(presign, file.uri, file.mimeType);
  },
};

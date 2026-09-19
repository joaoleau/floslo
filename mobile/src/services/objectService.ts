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
    } catch (err) {
      console.warn(`[Object] getById(${id}) falhou, retornando undefined`, err);
      return undefined;
    }
  },

  async update(id: string, tags: string[]): Promise<ObjectType> {
    console.log(`[Object] Atualizando tags de "${id}"`, tags);
    const updated = await objectsApi.updateTags(id, tags);
    return objectMapper.toDomain(updated);
  },

  async rename(id: string, name: string): Promise<ObjectType> {
    console.log(`[Object] Renomeando "${id}" para "${name}"`);
    const updated = await objectsApi.updateName(id, name);
    return objectMapper.toDomain(updated);
  },

  async deleteObject(id: string): Promise<void> {
    console.log(`[Object] Excluindo "${id}"`);
    // Cascades server-side: S3 file, S3 Vectors embeddings, scheduler links and the
    // DynamoDB record. Do not fall back to storageApi.deleteObject — that only
    // removes the S3 file and leaves the rest orphaned.
    await objectsApi.remove(id);
  },

  async upload(file: { uri: string; name: string; mimeType?: string }): Promise<void> {
    console.log(`[Object] Enviando "${file.name}" (${file.mimeType ?? 'sem mimeType'})`);
    try {
      const presign = await storageApi.getUploadUrl(file.name);
      await storageApi.uploadFileToPresignedUrl(presign, file.uri, file.mimeType);
      console.log(`[Object] "${file.name}" enviado com sucesso`);
    } catch (err) {
      console.error(`[Object] Falha ao enviar "${file.name}"`, err);
      throw err;
    }
  },
};

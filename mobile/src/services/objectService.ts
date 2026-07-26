import { mockObjects } from '@/api/mock/objects';
import { ObjectType } from '@/types/domain/Object';
import { ObjectDTO } from '@/types/api/ObjectDTO';
import { objectMapper } from '@/mappers/objectMapper';

export const objectService = {
  async getAll(): Promise<ObjectType[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const apiResponse = mockObjects as unknown as ObjectDTO[];
        const mappedData = apiResponse.map(objectMapper.toDomain);

        resolve(mappedData);
      }, 600);
    });
  },

  async deleteObject(id: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[Service] Objeto ${id} deletado`);
        resolve();
      }, 300);
    });
  },

  async getById(id: string): Promise<ObjectType | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const raw = mockObjects.find((o) => o.id === id) as unknown as ObjectDTO;
        resolve(raw ? objectMapper.toDomain(raw) : undefined);
      }, 500);
    });
  },

  async update(id: string, tags: string[]): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`[Service] Objeto ${id} atualizado com tags:`, tags);
        resolve();
      }, 500);
    });
  },
};

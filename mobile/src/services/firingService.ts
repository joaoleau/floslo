import { ragApi } from '@/api/rag';
import { ragMapper } from '@/mappers/ragMapper';
import { RAG } from '@/types/domain/RAG';

export const firingService = {
  async getBySchedulerId(schedulerId: string): Promise<RAG> {
    const raw = await ragApi.retrieveAndGenerate(schedulerId);
    return ragMapper.toDomain(raw);
  },
};

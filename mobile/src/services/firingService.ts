import { ragApi } from '@/api/rag';
import { ragMapper } from '@/mappers/ragMapper';
import { todayLocalDate } from '@/lib/localDate';
import { RAG } from '@/types/domain/RAG';

export const firingService = {
  // A floslo-rag registra o dia local como dia de estudo na mesma chamada que gera o disparo.
  async getBySchedulerId(schedulerId: string): Promise<RAG> {
    const raw = await ragApi.retrieveAndGenerate(schedulerId, todayLocalDate());
    return ragMapper.toDomain(raw);
  },
};

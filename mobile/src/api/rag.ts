import { RAGDTO, RAGRequestDTO } from '@/types/api/RAGDTO';
import { api } from './http/client';

export const ragApi = {
  retrieveAndGenerate(schedulerId: string) {
    const body: RAGRequestDTO = { scheduler_id: schedulerId };
    return api.post<RAGDTO>('/rag/retrieve-and-generate', body);
  },
};

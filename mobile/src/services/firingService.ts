import { ragResponseMock } from '@/api/mock/rag';
import { ragMapper } from '@/mappers/ragMapper';
import { RAG } from '@/types/domain/RAG';

export const firingService = {
  /**
   * Busca os desafios (RAG) associados a um alarme específico.
   * Por enquanto simula um delay de API, depois será um fetch real.
   */
  async getBySchedulerId(schedulerId: string): Promise<RAG> {
    console.log(`[Debug] firingService.getBySchedulerId chamado para id: ${schedulerId}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Futuramente: const response = await api.get(`/rag/${schedulerId}`);
        // Por enquanto: usamos o mock e mapeamos para a entidade de domínio
        const mappedData = ragMapper.toDomain(ragResponseMock);
        
        console.log('[Debug] Dados RAG carregados com sucesso.');
        resolve(mappedData);
      }, 600); // Simula 600ms de internet
    });
  },
};
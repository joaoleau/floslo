import { RecordAnswerRequestDTO, UserStatsDTO } from '@/types/api/UserStatsDTO';
import { api } from './http/client';

export const userStatsApi = {
  getStats() {
    return api.get<UserStatsDTO>('/api/user/me/stats');
  },

  recordAnswer(payload: RecordAnswerRequestDTO) {
    return api.post<{ message: string }>('/api/user/me/stats/answer', payload);
  },
};

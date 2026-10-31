import {
  CreateSchedulerRequestDTO,
  ListSchedulersResponseDTO,
  SchedulerDTO,
  UpdateSchedulerRequestDTO,
} from '@/types/api/SchedulerDTO';
import { api } from './http/client';

export const schedulerApi = {
  list() {
    return api.get<ListSchedulersResponseDTO>('/api/scheduler');
  },

  getById(id: string) {
    return api.get<SchedulerDTO>(`/api/scheduler/${id}`);
  },

  create(payload: CreateSchedulerRequestDTO) {
    return api.post<SchedulerDTO>('/api/scheduler', payload);
  },

  update(id: string, payload: UpdateSchedulerRequestDTO) {
    return api.put<SchedulerDTO>(`/api/scheduler/${id}`, payload);
  },

  remove(id: string) {
    return api.delete<{ message: string }>(`/api/scheduler/${id}`);
  },
};

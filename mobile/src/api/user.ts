import { UpdateUserRequestDTO, UserDTO } from '@/types/api/UserDTO';
import { api } from './http/client';

export const userApi = {
  getMe() {
    return api.get<UserDTO>('/api/user/me');
  },

  updateMe(payload: UpdateUserRequestDTO) {
    return api.put<UserDTO>('/api/user/me', payload);
  },

  deleteMe() {
    return api.delete<{ message: string }>('/api/user/me');
  },
};

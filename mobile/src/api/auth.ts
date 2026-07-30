import { LoginRequestDTO, LoginResponseDTO, RegisterRequestDTO, RegisterResponseDTO } from '@/types/api/AuthDTO';
import { api } from './http/client';

// Note: token refresh is intentionally not exposed here — it's private to
// src/api/http/client.ts to avoid a circular import (the client needs to
// call it internally on 401s).
export const authApi = {
  register(payload: RegisterRequestDTO) {
    return api.post<RegisterResponseDTO>('/api/auth/register', payload, { auth: false });
  },

  login(payload: LoginRequestDTO) {
    return api.post<LoginResponseDTO>('/api/auth/login', payload, { auth: false });
  },
};

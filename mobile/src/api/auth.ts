import {
  ForgotPasswordRequestDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  MessageResponseDTO,
  RegisterRequestDTO,
  RegisterResponseDTO,
  ResetPasswordRequestDTO,
  VerifyResetCodeRequestDTO,
} from '@/types/api/AuthDTO';
import { api } from './http/client';

export const authApi = {
  register(payload: RegisterRequestDTO) {
    return api.post<RegisterResponseDTO>('/api/auth/register', payload, { auth: false });
  },

  login(payload: LoginRequestDTO) {
    return api.post<LoginResponseDTO>('/api/auth/login', payload, { auth: false });
  },

  forgotPassword(payload: ForgotPasswordRequestDTO) {
    return api.post<MessageResponseDTO>('/api/auth/forgot-password', payload, { auth: false });
  },

  verifyResetCode(payload: VerifyResetCodeRequestDTO) {
    return api.post<MessageResponseDTO>('/api/auth/verify-reset-code', payload, { auth: false });
  },

  resetPassword(payload: ResetPasswordRequestDTO) {
    return api.post<MessageResponseDTO>('/api/auth/reset-password', payload, { auth: false });
  },
};

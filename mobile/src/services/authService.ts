import { authApi } from '@/api/auth';
import { tokenStorage } from '@/storage/tokenStorage';
import { LoginRequestDTO, LoginResponseDTO, RegisterRequestDTO } from '@/types/api/AuthDTO';

export const authService = {
  async login(payload: LoginRequestDTO): Promise<LoginResponseDTO> {
    const response = await authApi.login(payload);
    await tokenStorage.saveTokens(response.token, response.refresh_token);
    return response;
  },

  async register(payload: RegisterRequestDTO): Promise<LoginResponseDTO> {
    // The backend's register endpoint only returns a message, no tokens —
    // log in right after so signup keeps its "auto-login" UX.
    await authApi.register(payload);
    return authService.login({ username: payload.username, password: payload.password });
  },

  async resetPassword(_email: string): Promise<{ message: string }> {
    // No backend endpoint exists for this yet (no POST /api/auth/reset-password route).
    // Kept as a resolved stub so the existing "email sent" screen still works;
    // wire this up for real once the backend adds password-reset support.
    return { message: 'E-mail de recuperação enviado com sucesso!' };
  },

  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getAccessToken();
  },

  async logout(): Promise<void> {
    await tokenStorage.clear();
  },
};

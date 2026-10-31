import { authApi } from '@/api/auth';
import { tokenStorage } from '@/storage/tokenStorage';
import { schedulerService } from '@/services/schedulerService';
import { LoginRequestDTO, LoginResponseDTO, RegisterRequestDTO } from '@/types/api/AuthDTO';

export const authService = {
  async login(payload: LoginRequestDTO): Promise<LoginResponseDTO> {
    console.log(`[Auth] Login: ${payload.username}`);
    const response = await authApi.login(payload);
    await tokenStorage.saveTokens(response.token, response.refresh_token);
    console.log('[Auth] Login bem-sucedido, tokens salvos');

    schedulerService.resyncAll().catch((err) => {
      console.warn('[authService] Falha ao resincronizar alarmes nativos após login', err);
    });

    return response;
  },

  async register(payload: RegisterRequestDTO): Promise<LoginResponseDTO> {
    console.log(`[Auth] Registrando: ${payload.username} <${payload.email}>`);
    await authApi.register(payload);
    return authService.login({ username: payload.username, password: payload.password });
  },

  async resetPassword(email: string): Promise<{ message: string }> {
    console.log('[Auth] Solicitando código de recuperação de senha');
    return authApi.forgotPassword({ email });
  },

  async verifyResetCode(email: string, code: string): Promise<{ message: string }> {
    console.log('[Auth] Verificando código de recuperação de senha');
    return authApi.verifyResetCode({ email, code });
  },

  async confirmPasswordReset(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    console.log('[Auth] Confirmando reset de senha com código');
    return authApi.resetPassword({ email, code, new_password: newPassword });
  },

  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getAccessToken();
  },

  async logout(): Promise<void> {
    console.log('[Auth] Logout');
    await schedulerService.cancelAllNativeAlarms();
    await tokenStorage.clear();
  },
};

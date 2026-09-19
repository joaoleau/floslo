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

    // Reconcile native alarms for this account right away — covers switching accounts
    // in-app (logout then login without an app restart), not just cold start. Fire-and-forget:
    // a resync failure shouldn't block the login flow.
    schedulerService.resyncAll().catch((err) => {
      console.warn('[authService] Falha ao resincronizar alarmes nativos após login', err);
    });

    return response;
  },

  async register(payload: RegisterRequestDTO): Promise<LoginResponseDTO> {
    console.log(`[Auth] Registrando: ${payload.username} <${payload.email}>`);
    // The backend's register endpoint only returns a message, no tokens —
    // log in right after so signup keeps its "auto-login" UX.
    await authApi.register(payload);
    return authService.login({ username: payload.username, password: payload.password });
  },

  async resetPassword(email: string): Promise<{ message: string }> {
    console.log('[Auth] Solicitando código de recuperação de senha');
    // Resposta sempre genérica (mesmo se o e-mail não existir) -- o backend não revela
    // se a conta existe, de propósito.
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
    // Native alarm triggers/channels aren't scoped to the backend session — clear them here,
    // otherwise the next account to log in on this device would still get the previous
    // account's alarms firing.
    await schedulerService.cancelAllNativeAlarms();
    await tokenStorage.clear();
  },
};

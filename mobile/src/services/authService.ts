import * as SecureStore from 'expo-secure-store';

// ==========================================
// CONSTANTES DE STORAGE
// ==========================================
const TOKEN_KEY = 'floslo_access_token';
const REFRESH_TOKEN_KEY = 'floslo_refresh_token';

// Mocks baseados no seu payload
const mockAuthResponse = {
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJmbG9zbG8tYXBwIiwiZXhwIjoxNzg1Mzc0NDA0LCJpc3MiOiJmbG9zbG8iLCJzdWIiOiJ1c3JfYWJkMmQxY2ItMzdiYi00NzZmLWJhNTQtZGRmNDA0YWJiODhhIiwidHlwZSI6ImFjY2VzcyJ9.6aTc6uGXogdgaWGh5Q-Cw3RPlKtaqaS1iTrQXJHhnQI",
  refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJmbG9zbG8tYXBwIiwiZXhwIjoxNzg1OTc4MzA0LCJpc3MiOiJmbG9zbG8iLCJzdWIiOiJ1c3JfYWJkMmQxY2ItMzdiYi00NzZmLWJhNTQtZGRmNDA0YWJiODhhIiwidHlwZSI6InJlZnJlc2gifQ.hhKdDX69r20PXljS_ZMlPaZTAQwehdxYkFjH5-6kUHY"
};

export const authService = {
  // ==========================================
  // FUNÇÕES DE API (MOCK)
  // ==========================================
  
  async login(payload: any) {
    console.log('[AuthService] Login disparado com:', payload);
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        // Simulação de erro de senha (apenas para teste)
        if (payload.password === 'errado') {
          return reject(new Error('Usuário ou senha inválidos.'));
        }

        // Salva os tokens no celular
        await this.saveTokens(mockAuthResponse.token, mockAuthResponse.refresh_token);
        resolve(mockAuthResponse);
      }, 1000); // 1 segundo de "internet"
    });
  },

  async register(payload: any) {
    console.log('[AuthService] Cadastro disparado com:', payload);
    return new Promise((resolve) => {
      setTimeout(async () => {
        // Num app real, o register pode já logar o usuário
        await this.saveTokens(mockAuthResponse.token, mockAuthResponse.refresh_token);
        resolve(mockAuthResponse);
      }, 1000);
    });
  },

  async resetPassword(email: string) {
    console.log('[AuthService] Reset de senha disparado para:', email);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: 'E-mail de recuperação enviado com sucesso!' });
      }, 1000);
    });
  },

  // ==========================================
  // FUNÇÕES DE STORAGE (SECURE STORE)
  // ==========================================
  
  async saveTokens(token: string, refreshToken: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },

  async getAccessToken() {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
};
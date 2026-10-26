import { schedulerService } from '@/services/schedulerService';
import { onboardingStorage } from '@/storage/onboardingStorage';

/**
 * O que acontece toda vez que uma sessão começa: na abertura do app com uma sessão salva, no
 * login e no cadastro. Antes, só a abertura do app fazia isso, então quem acabava de se cadastrar
 * só via o manual de uso depois de reabrir o app, e quem fazia login só tinha os alarmes da conta
 * agendados no aparelho depois de reabrir.
 *
 * - Reagenda os alarmes nativos dos agendadores habilitados (um login ou uma instalação nova não
 *   tem nenhum gatilho no aparelho). Em segundo plano: uma falha aqui não impede de entrar.
 * - Devolve para onde ir: o manual de uso, se ainda não foi visto neste aparelho, ou as abas.
 */
export const sessionService = {
  async start(): Promise<'/onboarding' | '/(tabs)'> {
    schedulerService.resyncAll().catch((err) => {
      console.warn('[Session] Falha ao resincronizar alarmes nativos', err);
    });

    const hasSeenOnboarding = await onboardingStorage.hasSeenOnboarding();
    return hasSeenOnboarding ? '/(tabs)' : '/onboarding';
  },
};

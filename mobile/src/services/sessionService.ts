import { schedulerService } from '@/services/schedulerService';
import { onboardingStorage } from '@/storage/onboardingStorage';

export const sessionService = {
  async start(): Promise<'/onboarding' | '/(tabs)'> {
    schedulerService.resyncAll().catch((err) => {
      console.warn('[Session] Falha ao resincronizar alarmes nativos', err);
    });

    const hasSeenOnboarding = await onboardingStorage.hasSeenOnboarding();
    return hasSeenOnboarding ? '/(tabs)' : '/onboarding';
  },
};

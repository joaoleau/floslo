import { useEffect, useState } from 'react';

import { isLanguagePreference, LanguagePreference, saveLanguagePreference } from '@/i18n';
import { preferencesStorage } from '@/storage/preferencesStorage';
import { schedulerService } from '@/services/schedulerService';

export function useLanguagePreference() {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');

  useEffect(() => {
    preferencesStorage.getLanguage().then((saved) => {
      if (isLanguagePreference(saved)) setPreferenceState(saved);
    });
  }, []);

  async function setPreference(next: LanguagePreference) {
    setPreferenceState(next);
    await saveLanguagePreference(next);
    schedulerService.resyncAll().catch((err) => {
      console.warn('[useLanguagePreference] Falha ao reagendar os alarmes no novo idioma', err);
    });
  }

  return { preference, setPreference };
}

import { useEffect, useState } from 'react';

import { isLanguagePreference, LanguagePreference, saveLanguagePreference } from '@/i18n';
import { preferencesStorage } from '@/storage/preferencesStorage';
import { schedulerService } from '@/services/schedulerService';

// Preferência de idioma do app para a tela de Perfil. A troca vale na hora (as telas abertas
// usam useTranslation e se redesenham sozinhas); os alarmes já agendados são reagendados
// para a notificação também passar a usar o novo idioma.
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

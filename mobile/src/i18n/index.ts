import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import { preferencesStorage } from '@/storage/preferencesStorage';
import { pt } from './locales/pt';
import { en } from './locales/en';

// Idioma da interface do app (não confundir com o idioma dos desafios, escolhido por
// agendador). "system" segue o idioma do celular: português abre em português, qualquer
// outro idioma abre em inglês.
export type AppLanguage = 'pt' | 'en';
export type LanguagePreference = AppLanguage | 'system';

export function isLanguagePreference(value: string | null): value is LanguagePreference {
  return value === 'pt' || value === 'en' || value === 'system';
}

export function deviceLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === 'pt' ? 'pt' : 'en';
}

export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference === 'system' ? deviceLanguage() : preference;
}

i18n.use(initReactI18next).init({
  resources: { pt: { translation: pt }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function currentLanguage(): AppLanguage {
  return i18n.language === 'en' ? 'en' : 'pt';
}

// Locale das datas e horas exibidas (toLocaleDateString e afins).
export function dateLocale(): string {
  return currentLanguage() === 'en' ? 'en-US' : 'pt-BR';
}

// Lê a preferência salva e aplica o idioma. Chamado na abertura do app, antes da primeira
// tela, para não piscar no idioma do celular quando o usuário escolheu outro.
export async function loadLanguagePreference(): Promise<LanguagePreference> {
  const saved = await preferencesStorage.getLanguage().catch(() => null);
  const preference = isLanguagePreference(saved) ? saved : 'system';
  await i18n.changeLanguage(resolveLanguage(preference));
  return preference;
}

export async function saveLanguagePreference(preference: LanguagePreference): Promise<void> {
  await i18n.changeLanguage(resolveLanguage(preference));
  await preferencesStorage.saveLanguage(preference);
}

export { i18n };

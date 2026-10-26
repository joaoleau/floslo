import { ApiError } from '@/api/http/errors';
import { i18n } from './index';

// A API responde os erros em inglês e em texto livre (campo "error"). O app não mostra esse
// texto direto: os erros conhecidos viram uma mensagem no idioma do app, e os demais caem na
// mensagem genérica da ação que falhou.
const KNOWN_API_ERRORS: Record<string, string> = {
  'invalid credentials': 'errors.api.invalidCredentials',
  'invalid or expired code': 'errors.api.invalidCode',
  'username already exists': 'errors.api.usernameTaken',
  'username cannot be empty': 'errors.api.usernameRequired',
  'username is required': 'errors.api.usernameRequired',
  'email is required': 'errors.api.emailRequired',
  'password is required': 'errors.api.passwordRequired',
  'password must be at least 8 characters long': 'errors.api.weakPassword',
  'password must contain at least one letter and one number': 'errors.api.weakPassword',
  'current password is required to set a new password': 'errors.api.currentPasswordRequired',
  'current password is incorrect': 'errors.api.currentPasswordIncorrect',
  'a document needs at least one tag': 'errors.api.documentNeedsTag',
  'no challenge could be generated for this firing': 'errors.api.noChallenge',
  'no chunks available for this scheduler': 'errors.api.noChunks',
  'scheduler has no challengers': 'errors.api.noChallengeTypes',
  'at least one weekday is required': 'errors.api.weekdayRequired',
  'at least one document key is required': 'errors.api.documentRequired',
  'scheduler name is required': 'errors.api.schedulerNameRequired',
  'name cannot be empty': 'errors.api.schedulerNameRequired',
  'start time is required': 'errors.api.startTimeRequired',
  'object not found': 'errors.api.objectNotFound',
  'scheduler not found': 'errors.api.schedulerNotFound',
};

// fetch rejeita com TypeError ("Network request failed") quando não há conexão.
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /network/i.test(err.message);
}

/**
 * Mensagem de erro para mostrar ao usuário, no idioma do app. `fallbackKey` é a mensagem
 * genérica da ação (por exemplo, 'auth.login.failed'), usada quando o erro não é conhecido.
 */
export function errorMessage(err: unknown, fallbackKey: string): string {
  if (isNetworkError(err)) return i18n.t('errors.network');
  if (err instanceof ApiError) {
    const key = KNOWN_API_ERRORS[err.message.trim().toLowerCase()];
    if (key) return i18n.t(key);
  }
  return i18n.t(fallbackKey);
}

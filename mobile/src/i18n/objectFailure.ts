import { i18n } from './index';

// O processador grava o motivo da falha em português e em texto livre (error_message). O
// único motivo conhecido hoje é o PDF digitalizado; ele vira a mensagem no idioma do app, e
// qualquer outro cai na mensagem genérica.
const SCANNED_PDF_PREFIX = 'Este PDF parece ser um documento digitalizado';

export function objectFailureMessage(errorMessage: string | null | undefined): string {
  if (errorMessage?.startsWith(SCANNED_PDF_PREFIX)) return i18n.t('objects.failure.scanned');
  return i18n.t('objects.failure.generic');
}

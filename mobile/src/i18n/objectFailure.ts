import { i18n } from './index';

const SCANNED_PDF_PREFIX = 'Este PDF parece ser um documento digitalizado';

export function objectFailureMessage(errorMessage: string | null | undefined): string {
  if (errorMessage?.startsWith(SCANNED_PDF_PREFIX)) return i18n.t('objects.failure.scanned');
  return i18n.t('objects.failure.generic');
}

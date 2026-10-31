import * as Localization from 'expo-localization';

import { ApiError } from '@/api/http/errors';
import { i18n, resolveLanguage, dateLocale } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import { objectFailureMessage } from '@/i18n/objectFailure';
import { pt } from '@/i18n/locales/pt';
import { en } from '@/i18n/locales/en';

// O projeto não tem os tipos do Node; só o pouco de fs e path que o teste usa.
declare const __dirname: string;
interface DirEntry {
  name: string;
  isDirectory(): boolean;
}
const fs: {
  readdirSync(dir: string, options: { withFileTypes: true }): DirEntry[];
  readFileSync(file: string, encoding: 'utf8'): string;
} = jest.requireActual('fs');
const path: { join(...parts: string[]): string; basename(file: string): string } = jest.requireActual('path');

type Dict = { [key: string]: string | Dict };

function flatten(dict: Dict, prefix = ''): Record<string, string> {
  return Object.entries(dict).reduce<Record<string, string>>((acc, [key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [full]: value } : { ...acc, ...flatten(value, full) };
  }, {});
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : [];
  });
}

const ptKeys = flatten(pt as Dict);
const enKeys = flatten(en as Dict);

// Uma chave com plural existe no dicionário como chave_one e chave_other.
function exists(key: string): boolean {
  return key in ptKeys || (`${key}_one` in ptKeys && `${key}_other` in ptKeys);
}

afterEach(() => i18n.changeLanguage('pt'));

describe('dictionaries', () => {
  it('have the same keys in Portuguese and English', () => {
    expect(Object.keys(enKeys).sort()).toEqual(Object.keys(ptKeys).sort());
  });

  it('have every key used in the code', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(path.join(__dirname, '..'))) {
      const code = fs.readFileSync(file, 'utf8');
      const pattern = /(?:\bt|i18n\.t)\(\s*'([a-zA-Z0-9_.]+)'|i18nKey="([a-zA-Z0-9_.]+)"|errorMessage\([^,]+,\s*'([a-zA-Z0-9_.]+)'\)|'(errors\.api\.[a-zA-Z]+)'/g;
      for (const match of code.matchAll(pattern)) {
        const key = match[1] ?? match[2] ?? match[3] ?? match[4];
        if (!exists(key)) missing.push(`${path.basename(file)}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('never use "--" in a text shown to the user', () => {
    const offenders = [...Object.entries(ptKeys), ...Object.entries(enKeys)].filter(([, text]) => text.includes('--'));
    expect(offenders).toEqual([]);
  });
});

describe('language', () => {
  it('follows the phone language when the preference is automatic', () => {
    const getLocales = jest.spyOn(Localization, 'getLocales');
    getLocales.mockReturnValue([{ languageCode: 'pt' } as Localization.Locale]);
    expect(resolveLanguage('system')).toBe('pt');
    // Qualquer idioma que não seja o português abre em inglês.
    getLocales.mockReturnValue([{ languageCode: 'es' } as Localization.Locale]);
    expect(resolveLanguage('system')).toBe('en');
    expect(resolveLanguage('pt')).toBe('pt');
    getLocales.mockRestore();
  });

  it('switches texts and date locale with the language', async () => {
    expect(i18n.t('profile.title')).toBe('Perfil');
    expect(dateLocale()).toBe('pt-BR');
    await i18n.changeLanguage('en');
    expect(i18n.t('profile.title')).toBe('Profile');
    expect(i18n.t('common.selected', { count: 2 })).toBe('2 selected');
    expect(dateLocale()).toBe('en-US');
  });
});

describe('errorMessage', () => {
  it('translates known API errors and falls back to the action message', async () => {
    expect(errorMessage(new ApiError(401, 'invalid credentials'), 'auth.login.failed')).toBe(
      'Usuário, e-mail ou senha incorretos.'
    );
    expect(errorMessage(new ApiError(500, 'failed to create user: boom'), 'auth.register.failed')).toBe(
      i18n.t('auth.register.failed')
    );
    expect(errorMessage(new TypeError('Network request failed'), 'auth.login.failed')).toBe(i18n.t('errors.network'));

    await i18n.changeLanguage('en');
    expect(errorMessage(new ApiError(401, 'invalid credentials'), 'auth.login.failed')).toBe(
      'Wrong username, email or password.'
    );
  });
});

describe('objectFailureMessage', () => {
  it('recognizes the scanned PDF failure and hides any other raw message', async () => {
    const scanned = 'Este PDF parece ser um documento digitalizado (imagem). Ainda não conseguimos extrair texto.';
    await i18n.changeLanguage('en');
    expect(objectFailureMessage(scanned)).toBe(i18n.t('objects.failure.scanned'));
    expect(objectFailureMessage('Traceback: boom')).toBe("Couldn't process the document.");
    expect(objectFailureMessage(undefined)).toBe("Couldn't process the document.");
  });
});

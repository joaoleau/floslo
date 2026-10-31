import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['node_modules', '.expo', 'android', 'ios', 'dist', 'coverage'],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  react.configs.flat.recommended,

  {
    plugins: {
      'react-hooks': reactHooks,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    settings: {
      react: {
        version: 'detect',
      },
    },

    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      ...reactHooks.configs.recommended.rules,

      '@typescript-eslint/no-require-imports': 'off',

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },

  eslintConfigPrettier,
]);

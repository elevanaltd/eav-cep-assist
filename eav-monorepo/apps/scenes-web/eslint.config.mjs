// ESLint Flat Config (ESLint 9)
// Based on scripts-web pattern (2025-10-20)
// Preserves React-specific plugins and browser environment

import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // Global ignores (replaces .eslintignore + ignorePatterns)
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js',
    ],
  },

  // Base config for all TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ESLint recommended
      ...eslint.configs.recommended.rules,

      // TypeScript recommended
      ...tseslint.configs.recommended.rules,

      // React Hooks recommended
      ...reactHooks.configs.recommended.rules,

      // Custom rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },

  // Test files need Node.js and Vitest globals
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts', '**/test/**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node,
        vi: 'readonly',
        React: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
      },
    },
  },

  // Config files need Node.js globals
  {
    files: ['vite.config.ts', '*.config.ts', '*.config.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Test setup overrides
  {
    files: ['**/test/setup.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];

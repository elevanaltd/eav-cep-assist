// ESLint configuration for CEP Panel project
// Two execution contexts: CEP (modern JS) + ExtendScript (ES3)

export default [
  {
    // CEP Panels (JavaScript - Modern Browser)
    files: ['js/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        CustomEvent: 'readonly',
        // CEP-specific globals
        CSInterface: 'readonly',
        CSEvent: 'readonly',
        cep: 'readonly',
        cep_node: 'readonly'
      }
    },
    rules: {
      // Code Quality
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_|^e$' }],
      'no-undef': 'error',
      'no-console': 'off', // Allowed for debugging (CEP has console)

      // Best Practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'warn', // Prefer const/let but allow var for now
      'prefer-const': 'warn',

      // Style (2-space indent, single quotes)
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never']
    }
  },
  {
    // ExtendScript (ES3 - Premiere Pro Host)
    files: ['jsx/*.jsx', 'jsx/*.js'],
    languageOptions: {
      ecmaVersion: 3, // ES3 only (no modern JS)
      sourceType: 'script',
      globals: {
        // Adobe ExtendScript globals
        app: 'readonly',
        $: 'readonly',
        JSON: 'readonly',
        // ExtendScript utilities
        alert: 'readonly',
        confirm: 'readonly',
        // Adobe file system
        File: 'readonly',
        Folder: 'readonly',
        // Premiere Pro API
        ProjectItemType: 'readonly'
      }
    },
    rules: {
      // ES3 Constraints (STRICT)
      'no-const-assign': 'off', // const doesn't exist in ES3
      'no-var': 'off', // Must use var (const/let not available)
      'prefer-const': 'off', // const not available
      'prefer-arrow-callback': 'off', // Arrow functions not available
      'prefer-template': 'off', // Template literals not available
      'object-shorthand': 'off', // ES6 object shorthand not available

      // Code Quality (ES3 compatible)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_|^e$' }],
      'no-undef': 'error',
      'no-console': 'error', // ExtendScript doesn't have console

      // Best Practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],

      // Style
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never']
    }
  },
  {
    // Test Files (Modern JS + Vitest)
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        // Node.js globals
        process: 'readonly',
        global: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off' // Allowed in tests
    }
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'coverage/**',
      '.github/**',
      'docs/**',
      '.coord/**',
      '*.md',
      'js/CSInterface.js'  // Adobe vendor library (do not lint)
    ]
  }
];

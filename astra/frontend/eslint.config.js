import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'release/**', 'bundle-analysis.html'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Electron main/preload scripts run in a Node environment.
    // Scope Node globals to the electron layer only — do not disable
    // useful rules globally.
    files: ['electron/**/*.{js,cjs,mjs}', 'electron/*.{js,cjs,mjs}', 'scripts/**/*.{js,cjs,mjs}', '*.config.{js,cjs,mjs}', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        module: 'writable',
        Buffer: 'readonly',
        global: 'readonly',
        setInterval: 'readonly',
        setImmediate: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
    },
  },
)

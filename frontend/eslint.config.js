// Análisis estático del frontend. Ejecutar: npm run lint
import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Los componentes se usan solo en JSX; ESLint base no lo detecta (misma regla que la plantilla de Vite).
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // Dependencias completas en useEffect/useCallback.
      'react-hooks/exhaustive-deps': 'warn',
      // 'rules-of-hooks' identifica los hooks por el prefijo "use"; por la convención del proyecto en español
      // los hooks propios se llaman "usar…", así que esa regla daría falsos positivos y se desactiva.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['src/**/*.prueba.{js,jsx}', 'src/pruebas/**'],
    languageOptions: { globals: { ...globals.vitest } },
  },
]

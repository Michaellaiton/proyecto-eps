import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Pruebas unitarias y de componentes (Vitest). Los archivos de prueba se llaman *.prueba.js(x).
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/configuracion.js'],
    include: ['src/**/*.prueba.{js,jsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/principal.jsx', 'src/pruebas/**'],
      reporter: ['text-summary', 'text'],
      // Umbral mínimo para que la cobertura no baje sin que se note (REQ-08).
      thresholds: { lines: 75, statements: 75, branches: 65, functions: 65 },
    },
  },
})

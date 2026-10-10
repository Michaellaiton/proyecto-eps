// Pruebas de extremo a extremo (navegador real contra el backend y la base de datos reales).
// Usan el Microsoft Edge instalado en el equipo, así que no hay que descargar navegadores.
// Requisitos: PostgreSQL con `python manage.py sembrar_datos`. Ejecutar: npm run test:e2e
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './pruebas_e2e',
  testMatch: '**/*.e2e.js',
  timeout: 60000,
  workers: 1, // Los flujos comparten la base de datos de demostración.
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'msedge',
    headless: true,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  // Reutiliza los servidores si ya están corriendo; si no, los inicia.
  webServer: [
    {
      command: '..\\backend\\.venv\\Scripts\\python.exe ..\\backend\\manage.py runserver 8000',
      url: 'http://localhost:8000/api/v1/salud/',
      reuseExistingServer: true,
      timeout: 60000,
    },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60000 },
  ],
})

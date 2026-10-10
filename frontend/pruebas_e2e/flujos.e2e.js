// Flujos completos en un navegador real: inicio de sesión, agendamiento, cancelación y simulador.
// Usan las cuentas de `sembrar_datos`; la contraseña se lee de backend/.env (EPS_CLAVE_USUARIOS_DEMO)
// o de la variable de entorno del mismo nombre. Cada prueba deja los datos como estaban.
import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

function claveDemo() {
  if (process.env.EPS_CLAVE_USUARIOS_DEMO) return process.env.EPS_CLAVE_USUARIOS_DEMO
  const linea = readFileSync(new URL('../../backend/.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('EPS_CLAVE_USUARIOS_DEMO='))
  return linea?.split('=').slice(1).join('=')
}

async function ingresar(page, usuario, clave = claveDemo()) {
  await page.goto('/#/ingresar')
  await page.getByLabel('Usuario', { exact: true }).fill(usuario)
  await page.getByLabel('Contraseña', { exact: true }).fill(clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test('un visitante ve la página de inicio y abre el asistente', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tu cita médica')
  await page.getByRole('button', { name: 'Abrir asistente virtual' }).click()
  await expect(page.getByText('Soy el asistente de Citas EPS')).toBeVisible()
})

test('una contraseña incorrecta muestra el error', async ({ page }) => {
  await ingresar(page, 'paciente20', 'contraseña-incorrecta')
  await expect(page.getByRole('alert')).toContainText('Usuario o contraseña incorrectos')
})

test('un paciente agenda una cita y luego la cancela (CU-01, CU-02, CU-03)', async ({ page }) => {
  await ingresar(page, 'paciente20')
  await expect(page.getByRole('heading', { name: 'Agendar cita' })).toBeVisible()

  await page.getByRole('radio', { name: 'Odontología' }).click()
  await page.getByRole('radio', { name: /Andrés Prueba Ruiz/ }).click()
  // Primer día hábil con horarios a partir de mañana.
  const dias = page.locator('.dia:not(.dia--fin-semana)')
  await dias.nth(2).click()
  const primeraHora = page.locator('.franja').first()
  await expect(primeraHora).toBeVisible()
  const hora = await primeraHora.textContent()
  await primeraHora.click()
  await page.getByRole('button', { name: 'Confirmar cita' }).click()

  await expect(page.getByRole('heading', { name: '¡Cita agendada!' })).toBeVisible()
  await expect(page.getByText(hora)).toBeVisible()

  await page.getByRole('button', { name: 'Ver mis citas' }).click()
  await page.getByRole('button', { name: 'Cancelar' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Sí, cancelar' }).click()
  await expect(page.getByText('Cita cancelada. El cupo quedó libre.')).toBeVisible()
})

test('el administrador ejecuta una ráfaga con controles y ve una sola reserva', async ({ page }) => {
  await ingresar(page, 'admin')
  await page.getByRole('button', { name: 'Simulador', exact: true }).click()
  await page.getByLabel('Pacientes simultáneos').fill('10')
  await page.getByRole('button', { name: 'Iniciar simulación' }).click()

  const resultado = page.locator('.resultado-destacado')
  await expect(resultado).toContainText('reserva(s) para una sola franja', { timeout: 30000 })
  await expect(resultado.locator('strong')).toHaveText('1')
  await expect(page.locator('.consola__linea').first()).toBeVisible()
})

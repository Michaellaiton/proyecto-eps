// Preparación común de las pruebas de componentes.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom no implementa el desplazamiento; los componentes lo usan para centrar elementos.
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.scrollTo = vi.fn()
Element.prototype.scrollBy = vi.fn()
window.scrollTo = vi.fn()

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
})

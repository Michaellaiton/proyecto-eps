// Color estable a partir de un texto (para avatares con iniciales).
export function colorDeTexto(texto = '') {
  let suma = 0
  for (const letra of texto) suma = (suma * 31 + letra.charCodeAt(0)) % 360
  return `hsl(${suma}, 52%, 46%)`
}

export function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

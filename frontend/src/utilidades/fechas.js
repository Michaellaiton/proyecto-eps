// Fechas en formato local (America/Bogota) para la interfaz.

export function hoyIso() {
  const hoy = new Date()
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset())
  return hoy.toISOString().slice(0, 10)
}

export function formatearFecha(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatearFechaHora(fechaHoraIso) {
  if (!fechaHoraIso) return '—'
  return new Date(fechaHoraIso)
    .toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    .replaceAll('.', '')
}

// Primer y último día del mes actual en formato AAAA-MM-DD.
export function rangoMesActual() {
  const hoy = hoyIso()
  const [anio, mes] = hoy.split('-').map(Number)
  const ultimoDia = new Date(anio, mes, 0).getDate()
  const mm = String(mes).padStart(2, '0')
  return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${String(ultimoDia).padStart(2, '0')}` }
}

export function sumarDias(fechaIso, dias) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia + dias)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

// True si la fecha y hora (AAAA-MM-DD, HH:MM) ya llegaron según el reloj del equipo.
export function yaLlego(fechaIso, hora) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  const [horas, minutos] = hora.split(':').map(Number)
  return new Date(anio, mes - 1, dia, horas, minutos) <= new Date()
}

// Fecha corta para tarjetas: "lun 12 oct".
export function formatearFechaCorta(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
    .toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
    .replaceAll('.', '')
}

// Tiempo relativo corto: "ahora", "hace 5 min", "hace 3 h", "hace 2 días".
export function haceTiempo(fechaHoraIso) {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(fechaHoraIso).getTime()) / 60000))
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}

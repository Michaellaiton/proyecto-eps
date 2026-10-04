// Registro de auditoría: quién hizo qué y con qué resultado (no repudio, REQ-07).
import { useState } from 'react'

import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import Paginacion from '../../componentes/Paginacion.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { listarAuditoria } from '../../servicios/administracionServicio.js'
import { formatearFechaHora } from '../../utilidades/fechas.js'

const OPERACIONES = [
  'AGENDAR', 'CANCELAR', 'CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'RESTABLECER_CLAVE',
  'ACTUALIZAR_HORARIO', 'CREAR_ESPECIALIDAD', 'ACTUALIZAR_ESPECIALIDAD', 'ELIMINAR_ESPECIALIDAD',
  'BLOQUEAR', 'ELIMINAR_BLOQUEO', 'REGISTRAR_ATENCION', 'REPROGRAMAR', 'INICIAR_SESION',
]
const RESULTADOS = ['OK', 'DENEGADO', 'CONFLICTO']
const FILTROS_VACIOS = { operacion: '', resultado: '', usuario: '' }

export default function VistaAuditoria() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(1)
  const registros = usarConsulta(() => listarAuditoria({ ...aplicados, pagina }), [aplicados, pagina])

  return (
    <section className="tarjeta">
      <h2>Auditoría</h2>
      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault()
          setPagina(1)
          setAplicados(filtros)
        }}
      >
        <CampoSeleccion
          id="auditoria-operacion"
          etiqueta="Operación"
          valor={filtros.operacion}
          alCambiar={(v) => setFiltros((f) => ({ ...f, operacion: v }))}
          textoVacio="Todas"
          opciones={OPERACIONES.map((o) => ({ valor: o, texto: o.replaceAll('_', ' ').toLowerCase() }))}
        />
        <CampoSeleccion
          id="auditoria-resultado"
          etiqueta="Resultado"
          valor={filtros.resultado}
          alCambiar={(v) => setFiltros((f) => ({ ...f, resultado: v }))}
          textoVacio="Todos"
          opciones={RESULTADOS.map((r) => ({ valor: r, texto: r }))}
        />
        <div className="campo">
          <label htmlFor="auditoria-usuario">Usuario</label>
          <input id="auditoria-usuario" value={filtros.usuario} onChange={(e) => setFiltros((f) => ({ ...f, usuario: e.target.value }))} />
        </div>
        <button type="submit" className="boton">Filtrar</button>
      </form>

      <MensajeError error={registros.error} />
      {registros.cargando && <p>Cargando…</p>}
      {registros.datos && (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Operación</th>
                <th>Tabla / registro</th>
                <th>Resultado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.datos.results.map((r) => (
                <tr key={r.id_auditoria}>
                  <td>{formatearFechaHora(r.fecha)}</td>
                  <td>{r.usuario ?? '—'}</td>
                  <td>{r.operacion}</td>
                  <td>{r.tabla}{r.id_registro ? ` #${r.id_registro}` : ''}</td>
                  <td>
                    <span className={`estado ${r.resultado === 'OK' ? 'estado--agendada' : 'estado--cancelada'}`}>{r.resultado}</span>
                  </td>
                  <td>{r.detalle || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {registros.datos.count === 0 && <p>No hay registros con esos filtros.</p>}
          <Paginacion pagina={pagina} total={registros.datos.count} alCambiar={setPagina} />
        </>
      )}
    </section>
  )
}

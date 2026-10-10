// Registro de auditoría: quién hizo qué y con qué resultado (no repudio, REQ-07).
import { useState } from 'react'
import { CircleAlert, CircleCheck, Filter, ScrollText, ShieldAlert, UserRound } from 'lucide-react'

import Boton from '../../componentes/Boton.jsx'
import Campo from '../../componentes/Campo.jsx'
import CampoSeleccion from '../../componentes/CampoSeleccion.jsx'
import { Cargando, Vacio } from '../../componentes/Estados.jsx'
import Insignia from '../../componentes/Insignia.jsx'
import MensajeError from '../../componentes/MensajeError.jsx'
import Paginacion from '../../componentes/Paginacion.jsx'
import { usarConsulta } from '../../controladores/usarConsulta.js'
import { listarAuditoria } from '../../servicios/administracionServicio.js'
import { formatearFechaHora } from '../../utilidades/fechas.js'

const OPERACIONES = [
  'AGENDAR', 'CANCELAR', 'REPROGRAMAR', 'REGISTRAR_ATENCION', 'BLOQUEAR', 'ELIMINAR_BLOQUEO',
  'CREAR_USUARIO', 'ACTUALIZAR_USUARIO', 'RESTABLECER_CLAVE', 'ACTUALIZAR_PERFIL', 'CAMBIAR_CLAVE', 'INICIAR_SESION',
  'ACTUALIZAR_HORARIO', 'CREAR_ESPECIALIDAD', 'ACTUALIZAR_ESPECIALIDAD', 'ELIMINAR_ESPECIALIDAD', 'SIMULAR_CONCURRENCIA',
]
const RESULTADOS = {
  OK: { tono: 'exito', icono: CircleCheck },
  DENEGADO: { tono: 'peligro', icono: ShieldAlert },
  CONFLICTO: { tono: 'aviso', icono: CircleAlert },
}
const FILTROS_VACIOS = { operacion: '', resultado: '', usuario: '' }
const legible = (operacion) => operacion.replaceAll('_', ' ').toLowerCase()

export default function VistaAuditoria() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [aplicados, setAplicados] = useState(FILTROS_VACIOS)
  const [pagina, setPagina] = useState(1)
  const registros = usarConsulta(() => listarAuditoria({ ...aplicados, pagina }), [aplicados, pagina])

  return (
    <section className="tarjeta">
      <form
        className="filtros"
        onSubmit={(e) => {
          e.preventDefault()
          setPagina(1)
          setAplicados(filtros)
        }}
      >
        <Campo id="auditoria-usuario" icono={UserRound} placeholder="Usuario" aria-label="Usuario" value={filtros.usuario} onChange={(e) => setFiltros((f) => ({ ...f, usuario: e.target.value }))} />
        <CampoSeleccion
          id="auditoria-operacion"
          valor={filtros.operacion}
          alCambiar={(v) => setFiltros((f) => ({ ...f, operacion: v }))}
          textoVacio="Todas las operaciones"
          opciones={OPERACIONES.map((o) => ({ valor: o, texto: legible(o) }))}
        />
        <CampoSeleccion
          id="auditoria-resultado"
          valor={filtros.resultado}
          alCambiar={(v) => setFiltros((f) => ({ ...f, resultado: v }))}
          textoVacio="Todos los resultados"
          opciones={Object.keys(RESULTADOS).map((r) => ({ valor: r, texto: r }))}
        />
        <Boton type="submit" variante="secundario" icono={Filter}>
          Filtrar
        </Boton>
      </form>

      <MensajeError error={registros.error} />
      {registros.cargando ? (
        <Cargando />
      ) : registros.datos?.count === 0 ? (
        <Vacio icono={ScrollText} titulo="Sin registros" />
      ) : (
        registros.datos && (
          <>
            <div className="tabla-contenedor">
              <table className="tabla tabla--adaptable">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Operación</th>
                    <th>Resultado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.datos.results.map((r) => {
                    const resultado = RESULTADOS[r.resultado] ?? {}
                    return (
                      <tr key={r.id_auditoria}>
                        <td className="texto-suave">{formatearFechaHora(r.fecha)}</td>
                        <td>{r.usuario ?? '—'}</td>
                        <td>
                          <strong className="capitalizar">{legible(r.operacion)}</strong>
                          <div className="texto-suave">
                            {r.tabla}
                            {r.id_registro ? ` #${r.id_registro}` : ''}
                          </div>
                        </td>
                        <td>
                          <Insignia tono={resultado.tono} icono={resultado.icono}>
                            {r.resultado}
                          </Insignia>
                        </td>
                        <td className="texto-suave">{r.detalle || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagina} total={registros.datos.count} alCambiar={setPagina} />
          </>
        )
      )}
    </section>
  )
}

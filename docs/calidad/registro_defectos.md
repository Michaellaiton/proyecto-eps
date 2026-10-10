# Registro de defectos

Defectos reales encontrados durante el desarrollo del sistema en Django + React (octubre de 2026), con la forma en que se detectaron, su causa raíz y la corrección. Continúa la numeración del informe de Calidad de Software, cuya Entrega 2 registró DEF-01 y DEF-02.

| ID | Detectado por | Descripción | Severidad | Causa raíz | Corrección | Prueba que lo cubre | Estado |
|---|---|---|---|---|---|---|---|
| DEF-03 | Revisión visual en el navegador | Al cambiar de sección en un panel quedaba visible el título de la sección anterior. | Media | El título y la vista eran elementos hermanos con la misma `key` de React. | Título y vista se envuelven en un solo contenedor con la `key` de la sección (`DisenoPanel.jsx`). | `aplicacion.prueba.jsx` | Cerrado |
| DEF-04 | Revisión visual | La tira de días ensanchaba la página y el contenido se salía por la derecha. | Media | La columna de contenido de la grilla usaba `1fr`, cuyo mínimo es el ancho del contenido. | `minmax(0, 1fr)` y `min-width: 0` en la columna del panel. | Revisión en escritorio y celular | Cerrado |
| DEF-05 | Revisión visual | Citas pasadas que el médico no registró mostraban los botones Reprogramar y Cancelar en el historial. | Media | Las acciones dependían del estado (`Agendada`) y no de si la cita era próxima. | Las acciones solo se muestran en la lista de próximas. | `pantallas_paciente_medico.prueba.jsx` | Cerrado |
| DEF-06 | Prueba automatizada (`prueba_asistente.py`) | El asistente no entendía «¿Cómo pido una cita?», que era una de sus propias sugerencias. | Media | La intención de agendar solo reconocía «pedir cita» y no conjugaciones como «pido». | Se ampliaron las frases reconocidas. | `prueba_detecta_la_intencion` | Cerrado |
| DEF-07 | Revisión de las respuestas | Las fechas del asistente y de los correos salían con mayúscula («Lunes 12 de Octubre»). | Baja | El formato de fechas de Django capitaliza días y meses. | Se convierten a minúscula, como corresponde en español. | `prueba_disponibilidad_por_especialidad_con_sinonimo` | Cerrado |
| DEF-08 | Ejecución del simulador | La línea base sin controles solo duplicaba 2 de 30 reservas, cuando el problema real es mucho mayor. | Alta (para la evidencia) | Cada hilo abría su conexión a PostgreSQL después de la barrera de sincronía; la autenticación escalonaba las solicitudes. | La conexión se abre antes de la barrera; ahora la línea base reproduce 29–30 de 30, como la Entrega 2. | `prueba_rafaga_sin_controles_reproduce_el_sobreagendamiento` | Cerrado |
| DEF-09 | Revisión del simulador | El mensaje de sobreagendamiento contaba las solicitudes en lugar de las reservas duplicadas. | Baja | Se usaba el campo equivocado del resultado. | Se usa `reservas_en_la_franja`. | Revisión manual | Cerrado |
| DEF-10 | Prueba de producción (`check --deploy`) | La configuración de producción dejaba el correo en el backend de consola. | Media | El valor por defecto es de desarrollo y no había verificación para producción. | La prueba `prueba_seguridad_produccion.py` exige SMTP y cero advertencias de seguridad. | `prueba_configuracion_de_produccion_sin_advertencias` | Cerrado |
| DEF-11 | Revisión de accesibilidad | Las tarjetas de selección (especialidad, médico, escenario) no tenían nombre para lectores de pantalla. | Media | Botones con `role="radio"` cuyo contenido no producía un nombre accesible. | `aria-label` con el título y el detalle de cada opción. | `componentes.prueba.jsx` (SelectorTarjetas) | Cerrado |
| DEF-12 | Prueba con zoom alto | Con zoom alto desaparecía el botón de cerrar sesión del menú lateral. | Media | El menú medía exactamente la altura de la pantalla y no permitía desplazarse. | El menú se desplaza dentro de su espacio y la tarjeta de usuario queda fija abajo. | Revisión a 1100 × 520 px | Cerrado |
| DEF-13 | Prueba E2E (Playwright) | El selector «Contraseña» coincidía también con el botón «Mostrar contraseña». | Baja (en la prueba) | Búsqueda por etiqueta no exacta. | Selector con coincidencia exacta. | `flujos.e2e.js` | Cerrado |

## Cómo se detectan

- **Backend:** `pytest` (pruebas unitarias, de integración, de concurrencia y de producción) y `ruff`.
- **Frontend:** `npm run test` (Vitest + Testing Library), `npm run lint` (ESLint) y `npm run test:e2e` (Playwright con Edge).
- **Integración continua:** `.github/workflows/integracion_continua.yml` corre el análisis estático y las pruebas en cada cambio.

# Proyecto EPS — Sistema de agendamiento de citas médicas

Proyecto universitario (Ingeniería de Sistemas, CUN) que se reutiliza en Ingeniería Web, Administración de Bases de Datos, Calidad de Software, Redes Inalámbricas y Matemáticas Especiales. Responder y documentar siempre en español.

## Stack (decidido)
- Backend: Python + Django + Django REST Framework, en `backend/`.
- Frontend: React (Vite), en `frontend/`.
- Base de datos: PostgreSQL 18 (servicio local `postgresql-x64-18`).
- Un solo repositorio con `backend/` y `frontend/`.

## Convenciones
- **Todo en español**: nombres de archivos, carpetas, clases, funciones, variables y comentarios. Excepciones: los nombres que el framework exige (`manage.py`, `models.py`, `apps.py`, `admin.py`, `migrations/`, `package.json`, `vite.config.js`, `index.html`) y la API propia de Django/React (`get_queryset`, `useState`…).
- **Metodología MVC**:
  - Modelo → `models.py` de cada aplicación (y `servicios.py` para las reglas de negocio y las transacciones).
  - Controlador → `vistas.py` (vistas de la API) + `rutas.py`.
  - Vista → el frontend React (`src/vistas/`, `src/componentes/`). En el backend, `serializadores.py` define la forma del JSON.
  - En el frontend: `servicios/` (llamadas a la API), `controladores/` (hooks que unen vista y servicio), `vistas/` (pantallas), `componentes/` (piezas reutilizables).
- Ajustes de Django en `configuracion/ajustes.py` y rutas en `configuracion/rutas.py`.
- Secretos y parámetros del sistema en `.env` (plantilla en `.env.example`), nunca en el código.
- Pruebas: archivos `prueba_*.py` dentro de `pruebas/` en cada aplicación; funciones `prueba_*`. Ejecutar con `pytest` desde `backend/`.
- Tablas agregadas después de los informes: `notificaciones` (avisos internos), el campo `citas.recordatorio_enviado_en` y las del simulador (`simulaciones`, `simulacion_eventos`, `simulacion_reservas_sin_control`, esta última solo para la línea base sin controles; nunca se usa en el agendamiento real).
- Respetar los nombres del modelo de datos ya entregado en los informes: tablas `pacientes`, `doctores`, `citas`, `especialidades`, `horario_base`, `bloqueos_agenda`, `auditoria`, `usuarios`; llaves `id_paciente`, `id_doctor`, `id_cita`, etc.; estados `Agendada`, `Cancelada`, `Atendida`, `No asistio`; roles `PACIENTE`, `DOCTOR`, `ADMIN` (`ADMIN` es el superadministrador; no se crea un cuarto rol).
- La regla contra el doble agendamiento usa índices únicos parciales (`ux_citas_franja_activa`, `ux_citas_paciente_hora_activa`) más un bloqueo pesimista (`select_for_update`) sobre el médico al reservar.
- Cada pantalla o endpoint debe mapearse a un caso de uso (CU-01 a CU-05) y a un requisito (REQ-01 a REQ-09) del informe de Calidad de Software.
- Los usuarios no se borran: se desactivan (`is_active`), para conservar la trazabilidad de sus citas. Toda acción administrativa se registra en `auditoria`.

## Frontend (diseño)
- Íconos con `lucide-react`. Navegación por fragmento de la URL (`#/agendar`) con `controladores/ContextoNavegacion.jsx`; los paneles por rol usan `componentes/DisenoPanel.jsx` con una lista de secciones `{id, texto, icono, guia, Vista}`.
- Reutilizar los componentes existentes (`Boton`, `Campo`, `CampoSeleccion`, `SelectorTarjetas`, `SelectorDias`, `SelectorFranjas`, `Dialogo`/`DialogoConfirmacion`, `Insignia`/`EstadoCita`, `Estados` para cargando y vacío) y los avisos flotantes (`usarAvisos`) antes de crear otros.
- Estilos en `src/estilos/` (`variables.css`, `base.css`, `componentes.css`, `paginas.css`) con los tokens de `variables.css`. Sin estilos en línea, salvo valores que dependen de datos (color de avatar, ancho de barras).
- Textos cortos y guiados por íconos; respetar `prefers-reduced-motion`.

## Calidad y operación
- Antes de terminar un cambio en el backend: `ruff check .`, `ruff format .` y `pytest` desde `backend/` (la integración continua exige 0 hallazgos y una cobertura ≥ 80 %).
- Frontend: pruebas en `src/pruebas/*.prueba.js(x)` (Vitest + Testing Library; API simulada con `src/pruebas/apoyo.js`), E2E en `pruebas_e2e/*.e2e.js` (Playwright con Edge). Antes de terminar: `npm.cmd run lint` y `npm.cmd run test:cobertura` (umbral 75 % de líneas).
- Los defectos encontrados se anotan en `docs/calidad/registro_defectos.md`.
- Los avisos al usuario pasan por `aplicaciones/notificaciones/servicios.py`: crean la notificación interna dentro de la transacción y encolan el correo como tarea (`django.tasks`) en `on_commit`.
- Los reportes pesados leen con `alias_lectura()` (`configuracion/bd.py`), que usa la réplica si está configurada.

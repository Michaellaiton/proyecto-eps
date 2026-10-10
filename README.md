# Sistema de agendamiento de citas EPS

Backend en Django (API REST) y frontend en React, con base de datos PostgreSQL.

```
proyecto-eps/
├── backend/
│   ├── configuracion/        ajustes.py, rutas.py, vistas.py (salud), wsgi/asgi
│   ├── aplicaciones/
│   │   ├── usuarios/         Usuario con rol (PACIENTE, DOCTOR, ADMIN)
│   │   ├── medicos/          Especialidad, Doctor, HorarioBase, BloqueoAgenda
│   │   ├── pacientes/        Paciente
│   │   ├── citas/            Cita (índices únicos parciales contra el doble agendamiento)
│   │   ├── auditoria/        Registro de operaciones
│   │   ├── administracion/   Módulo del superadministrador (rol ADMIN)
│   │   ├── notificaciones/   Correos al paciente
│   │   └── asistente/        Asistente virtual por reglas (chatbot)
│   ├── .env.example
│   ├── requirements.txt
│   └── manage.py
└── frontend/
    └── src/
        ├── configuracion/    entorno.js
        ├── servicios/        llamadas a la API
        ├── controladores/    hooks y contextos (sesión, navegación, avisos, asistente)
        ├── vistas/           pantallas (inicio, paciente, doctor/, administrador/)
        ├── componentes/      piezas reutilizables (botones, selectores, diálogos, asistente…)
        ├── utilidades/       fechas, colores e íconos
        └── estilos/          variables, base, componentes y páginas
```

## 1. Base de datos (una sola vez)

En `psql` como usuario `postgres`, crear el usuario de la aplicación y la base de datos:

```sql
CREATE USER eps_app WITH PASSWORD 'CAMBIE_ESTA_CLAVE' CREATEDB;
CREATE DATABASE eps_citas OWNER eps_app;
```

`CREATEDB` permite que `pytest` cree la base de datos temporal de pruebas.

## 2. Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1          # o: python -m venv .venv ; pip install -r requirements.txt
# Completar EPS_BD_CLAVE en backend\.env
python manage.py migrate
python manage.py sembrar_datos        # datos ficticios: admin, medico1…6, paciente1…30
python manage.py runserver            # http://localhost:8000/api/v1/salud/
pytest
```

La contraseña de las cuentas de demostración es el valor de `EPS_CLAVE_USUARIOS_DEMO` en `backend\.env`.

### API v1

| Método y ruta | Rol | Caso de uso / requisito |
|---|---|---|
| `POST /api/v1/usuarios/iniciar-sesion/` | Público | REQ-07 |
| `POST /api/v1/usuarios/renovar-token/` | Público | REQ-07 |
| `GET, PATCH /api/v1/usuarios/yo/` (`{email?, telefono?}`) | Autenticado | Mi perfil |
| `POST /api/v1/usuarios/cambiar-clave/` (`{clave_actual, clave_nueva}`) | Autenticado | Mi perfil · REQ-07 |
| `GET /api/v1/medicos/especialidades/` | Público | CU-01 · REQ-01 |
| `GET /api/v1/medicos/?especialidad=<id>` | Autenticado | CU-01 · REQ-01 |
| `GET /api/v1/medicos/<id>/disponibilidad/?fecha=AAAA-MM-DD` | Autenticado | CU-01 · REQ-01, REQ-05 |
| `POST /api/v1/citas/` | PACIENTE | CU-02 · REQ-02, REQ-03 |
| `GET /api/v1/citas/mias/` | PACIENTE | REQ-04 |
| `PATCH /api/v1/citas/<id>/cancelar/` | PACIENTE, ADMIN | CU-03 · REQ-04, REQ-07 |
| `PATCH /api/v1/citas/<id>/reprogramar/` (`{fecha, hora, id_doctor?}`) | PACIENTE | CU-03 · REQ-04 |
| `GET /api/v1/medicos/agenda/?fecha=` | DOCTOR | CU-04 |
| `GET, POST /api/v1/medicos/bloqueos/` | DOCTOR | CU-04 · REQ-05 |
| `DELETE /api/v1/medicos/bloqueos/<id>/` | DOCTOR | CU-04 · REQ-05 |
| `PATCH /api/v1/citas/<id>/atencion/` (`{estado: "Atendida" \| "No asistio"}`) | DOCTOR | CU-04 |
| `GET /api/v1/administracion/resumen/` | ADMIN | Panel |
| `GET, POST /api/v1/administracion/usuarios/` (`?rol=&activo=&buscar=`) | ADMIN | Administrar usuarios y roles |
| `GET, PATCH /api/v1/administracion/usuarios/<id>/` | ADMIN | Administrar usuarios y roles |
| `POST /api/v1/administracion/usuarios/<id>/restablecer-clave/` | ADMIN | REQ-07 |
| `GET, POST, PATCH, DELETE /api/v1/administracion/especialidades/[<id>/]` | ADMIN | Catálogo |
| `GET, PUT /api/v1/administracion/medicos/<id>/horario/` | ADMIN | REQ-01 (oferta) |
| `GET /api/v1/administracion/citas/` (`?desde=&hasta=&id_doctor=&estado=&buscar=&pagina=`) | ADMIN | CU-03 |
| `GET /api/v1/administracion/reportes/ocupacion/?desde=&hasta=` | ADMIN | CU-05 |
| `GET /api/v1/administracion/auditoria/` (`?operacion=&resultado=&usuario=&pagina=`) | ADMIN | REQ-07 (no repudio) |
| `GET /api/v1/notificaciones/` · `GET …/contador/` | Autenticado | Notificaciones internas |
| `PATCH /api/v1/notificaciones/<id>/leida/` · `POST …/marcar-todas/` | Autenticado | Notificaciones internas |
| `GET /api/v1/administracion/reportes/ocupacion/exportar/?desde=&hasta=` | ADMIN | CU-05 · CSV |
| `GET /api/v1/administracion/citas/exportar/` (mismos filtros del listado) | ADMIN | CSV |
| `GET, POST /api/v1/simulacion/` · `GET …/<id>/?desde_evento=` | ADMIN | Simulador de concurrencia (OBS-01, REQ-03) |
| `POST /api/v1/asistente/` (`{mensaje}`) | Público (personaliza si hay sesión) | Asistente virtual · 30 mensajes/min |
| `GET /api/v1/salud/` | Público | Operación |

Errores: 401 sin token, 403 rol no permitido o cita ajena, 404 inexistente, 409 franja ocupada o bloqueada (incluye `sugerencia` con la siguiente franja libre del médico), 422 dato o regla inválida, 429 cuenta bloqueada por intentos fallidos de inicio de sesión.

### Notificaciones

- **Internas (campana):** cada usuario ve sus avisos. El paciente los recibe por sus citas, recordatorios y novedades; el médico, por citas nuevas o canceladas; el administrador, por bloqueos con citas afectadas; y todos, por eventos de seguridad. El contador se revisa cada 30 segundos.
- **Recordatorios:** `python manage.py enviar_recordatorios` avisa las citas de las próximas 24 horas (`EPS_HORAS_ANTICIPACION_RECORDATORIO`). Programarlo cada hora:
  ```powershell
  schtasks /Create /TN "EPS recordatorios" /SC HOURLY /TR "C:\proyecto-eps\backend\.venv\Scripts\python.exe C:\proyecto-eps\backend\manage.py enviar_recordatorios"
  ```
- **Correo:**

Al agendar, cancelar o reprogramar, y cuando un bloqueo del médico afecta una cita, se envía un correo al paciente. En desarrollo se usa el backend de consola: los correos se imprimen en la terminal donde corre `runserver`. Para enviarlos de verdad, configure las variables `EPS_CORREO_*` en `backend\.env`.

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev                           # http://localhost:5173
```

## Calidad (REQ-08)

**Backend** (desde `backend/`):

```powershell
ruff check .                     # análisis estático: 0 hallazgos
ruff format --check .            # convención de formato
pytest --cov=aplicaciones --cov=configuracion --cov-report=term   # pruebas y cobertura (≥ 80 %)
```

**Frontend** (desde `frontend/`):

```powershell
npm.cmd run lint                 # ESLint
npm.cmd run test                 # pruebas de componentes y pantallas (Vitest + Testing Library)
npm.cmd run test:cobertura       # con cobertura (umbral: 75 % de líneas)
npm.cmd run test:e2e             # extremo a extremo con Playwright en Microsoft Edge (backend y BD reales)
```

- **Producción:** `configuracion/pruebas/prueba_seguridad_produccion.py` comprueba que `manage.py check --deploy` no da advertencias con la configuración de producción (HTTPS, HSTS, cookies seguras, SMTP).
- **Integración continua:** `.github/workflows/integracion_continua.yml` ejecuta en GitHub, en cada push, el análisis estático y las pruebas del backend (con PostgreSQL real) y del frontend, y compila el frontend.
- **Pruebas de carga (OBS-01):** `backend/pruebas_carga/` (K6) y el simulador de concurrencia del panel del administrador.
- **Registro de defectos:** [`docs/calidad/registro_defectos.md`](docs/calidad/registro_defectos.md).

## Administración de la base de datos

Los scripts de roles y permisos, tablespaces, verificación de integridad, respaldo y restauración (RTO/RPO), junto con la guía de la réplica de solo lectura, están en [`backend/scripts/bd/`](backend/scripts/bd/LEEME.md).

## Simulador de concurrencia (panel del administrador → Simulador)

Reproduce el problema central de los informes —sobredemanda y doble agendamiento— directamente contra PostgreSQL, con hilos reales y los mismos servicios del sistema, y muestra en vivo cómo responde la base de datos: registro de cada solicitud, éxitos, rechazos (409), latencia p95, operaciones por segundo, conexiones activas, sesiones esperando un bloqueo y deadlocks.

| Escenario | Qué hace | Resultado esperado |
|---|---|---|
| Ráfaga **con controles** | N pacientes piden a la vez la misma hora con el mismo médico | 1 reserva; las latencias forman una "escalera" porque el bloqueo pone las reservas en fila |
| Ráfaga **sin controles** | Igual, con la lógica ingenua "consultar y luego insertar" en una tabla sin restricciones (línea base) | Sobreagendamiento: casi todas las solicitudes quedan con la misma franja |
| Consultas masivas | Varios usuarios durante X segundos: 85 % consultas y 15 % reservas | 0 franjas duplicadas |

Usa médicos y pacientes ficticios (`sim_*`) que se crean y se eliminan solos; solo corre una simulación a la vez. También desde la terminal:

```powershell
python manage.py simular_concurrencia --tipo rafaga --usuarios 30
python manage.py simular_concurrencia --tipo rafaga --usuarios 30 --sin-proteccion
python manage.py simular_concurrencia --tipo carga --hilos 20 --duracion 15
```

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
│   │   └── administracion/   Módulo del superadministrador (rol ADMIN)
│   ├── .env.example
│   ├── requirements.txt
│   └── manage.py
└── frontend/
    └── src/
        ├── configuracion/    entorno.js
        ├── servicios/        llamadas a la API
        ├── controladores/    hooks que unen vistas y servicios
        ├── vistas/           pantallas
        ├── componentes/      piezas reutilizables
        └── estilos/
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
| `GET /api/v1/usuarios/yo/` | Autenticado | REQ-07 |
| `GET /api/v1/medicos/especialidades/` | Autenticado | CU-01 · REQ-01 |
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
| `GET /api/v1/salud/` | Público | Operación |

Errores: 401 sin token, 403 rol no permitido o cita ajena, 404 inexistente, 409 franja ocupada o bloqueada (incluye `sugerencia` con la siguiente franja libre del médico), 422 dato o regla inválida, 429 cuenta bloqueada por intentos fallidos de inicio de sesión.

### Notificaciones

Al agendar, cancelar o reprogramar, y cuando un bloqueo del médico afecta una cita, se envía un correo al paciente. En desarrollo se usa el backend de consola: los correos se imprimen en la terminal donde corre `runserver`. Para enviarlos de verdad, configure las variables `EPS_CORREO_*` en `backend\.env`.

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev                           # http://localhost:5173
```

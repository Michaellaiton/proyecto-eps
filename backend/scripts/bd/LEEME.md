# Administración de la base de datos `eps_citas`

Scripts que implementan la arquitectura de administración del informe de **Administración de Bases de Datos**: roles y permisos, tablespaces, réplica de solo lectura, ajuste de memoria y WAL, respaldo y recuperación con RTO/RPO.

| Archivo | Para qué |
|---|---|
| `01_roles_y_permisos.sql` | Roles con privilegio mínimo. La auditoría queda de solo inserción y las citas no se pueden borrar. |
| `02_tablespaces.sql` | Tablespaces separados para datos e índices. |
| `03_verificar_integridad.sql` | Comprueba que no haya franjas duplicadas ni horarios cruzados (se usa después de las pruebas de carga). |
| `respaldar.ps1` | Respaldo diario comprimido, verificado y con retención. |
| `restaurar.ps1` | Restaura en una base nueva y mide el tiempo (RTO). |

## Objetivos de recuperación

| Indicador | Meta | Cómo se cumple |
|---|---|---|
| **RPO** (pérdida máxima de datos) | 24 h con respaldo diario; ≤ 5 min con archivado de WAL | `respaldar.ps1` diario + `archive_mode` (abajo) |
| **RTO** (tiempo de recuperación) | < 1 h | `restaurar.ps1` mide el tiempo real de restauración |

Para programar el respaldo diario en Windows:

```powershell
schtasks /Create /TN "EPS respaldo diario" /SC DAILY /ST 23:00 /TR "powershell -ExecutionPolicy Bypass -File C:\proyecto-eps\backend\scripts\bd\respaldar.ps1"
```

La contraseña se guarda en `%APPDATA%\postgresql\pgpass.conf` (una línea `localhost:5432:eps_citas:eps_app:CLAVE`), nunca en los scripts.

## Ajuste de memoria y WAL (`postgresql.conf`)

Valores de partida para un servidor de 8 GB de RAM dedicado. Ajustarlos según la memoria real:

```ini
shared_buffers = 2GB              # ~25 % de la RAM
effective_cache_size = 6GB        # ~75 % de la RAM
work_mem = 16MB                   # por operación de ordenamiento; ojo con muchas conexiones
maintenance_work_mem = 512MB
wal_level = replica               # necesario para la réplica
max_wal_size = 2GB
checkpoint_completion_target = 0.9
max_connections = 100             # la API usa un pool; ver CONNECTION LIMIT en 01_roles_y_permisos.sql
```

## Réplica de solo lectura para reportes

Separa los reportes y la analítica de las transacciones del agendamiento.

1. **En la instancia primaria** (`postgresql.conf`): `wal_level = replica`, `max_wal_senders = 5`. En `pg_hba.conf`:
   ```
   host  replication  eps_replicacion  IP_DE_LA_REPLICA/32  scram-sha-256
   ```
   Y crear el usuario: `CREATE ROLE eps_replicacion WITH REPLICATION LOGIN PASSWORD '...';`
2. **En el servidor de la réplica**, con el servicio detenido y la carpeta de datos vacía:
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\pg_basebackup.exe" -h IP_PRIMARIA -U eps_replicacion -D "D:\pg\replica" -R -P
   ```
   `-R` deja la réplica configurada en modo de solo lectura (*hot standby*).
3. **En `backend\.env`** del servidor de la API:
   ```
   EPS_BD_REPLICA_HOST=IP_DE_LA_REPLICA
   EPS_BD_REPLICA_USUARIO=eps_lectura
   EPS_BD_REPLICA_CLAVE=...
   ```
   El reporte de ocupación y las exportaciones CSV pasan a leer de la réplica (`configuracion/bd.py`). Sin esta variable, leen de la base principal.

## Reducir el RPO (archivado continuo del WAL)

```ini
archive_mode = on
archive_command = 'copy "%p" "D:\\pg\\wal_archivo\\%f"'
archive_timeout = 300             # fuerza un segmento cada 5 minutos → RPO ≤ 5 min
```

Con el respaldo base más los WAL archivados se puede recuperar hasta un momento exacto (*point-in-time recovery*).

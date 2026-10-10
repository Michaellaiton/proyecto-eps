-- =============================================================================
-- Roles y permisos de la base de datos eps_citas (Administración de Bases de Datos).
--
-- Principio de privilegio mínimo:
--   eps_app        propietario del esquema: ejecuta las migraciones de Django (ya existe).
--   eps_escritura  rol de grupo para la API en ejecución: lee y escribe, pero NO borra citas
--                  ni modifica la auditoría.
--   eps_solo_lectura rol de grupo para reportes y analítica (réplica de solo lectura).
--   eps_api        usuario de conexión de la API en producción (miembro de eps_escritura).
--   eps_lectura    usuario de conexión de los reportes / réplica (miembro de eps_solo_lectura).
--
-- Ejecutar como postgres, conectado a eps_citas, DESPUÉS de `python manage.py migrate`:
--   psql -U postgres -d eps_citas -v clave_api='...' -v clave_lectura='...' -f 01_roles_y_permisos.sql
-- =============================================================================

\set ON_ERROR_STOP on

-- Roles de grupo (sin inicio de sesión)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eps_escritura') THEN
        CREATE ROLE eps_escritura NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eps_solo_lectura') THEN
        CREATE ROLE eps_solo_lectura NOLOGIN;
    END IF;
END
$$;

-- Nadie fuera de los roles definidos puede crear objetos ni conectarse por defecto.
REVOKE ALL ON DATABASE eps_citas FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE eps_citas TO eps_escritura, eps_solo_lectura;
GRANT USAGE ON SCHEMA public TO eps_escritura, eps_solo_lectura;

-- Escritura: lectura, inserción y actualización en todas las tablas; uso de secuencias.
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO eps_escritura;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO eps_escritura;

-- Borrado solo donde el sistema lo necesita (catálogos, horarios, bloqueos, sesiones).
-- Las citas y los usuarios NUNCA se borran: se cancelan o desactivan (trazabilidad).
GRANT DELETE ON especialidades, horario_base, bloqueos_agenda, notificaciones, django_session TO eps_escritura;

-- La auditoría es de solo inserción: no se puede alterar ni borrar desde la aplicación (no repudio).
REVOKE UPDATE, DELETE ON auditoria FROM eps_escritura;

-- Solo lectura para reportes.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO eps_solo_lectura;

-- Las tablas que creen futuras migraciones heredan los mismos permisos.
ALTER DEFAULT PRIVILEGES FOR ROLE eps_app IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE ON TABLES TO eps_escritura;
ALTER DEFAULT PRIVILEGES FOR ROLE eps_app IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO eps_escritura;
ALTER DEFAULT PRIVILEGES FOR ROLE eps_app IN SCHEMA public
    GRANT SELECT ON TABLES TO eps_solo_lectura;

-- Usuarios de conexión
SELECT format('CREATE ROLE eps_api LOGIN PASSWORD %L IN ROLE eps_escritura', :'clave_api')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eps_api') \gexec

SELECT format('CREATE ROLE eps_lectura LOGIN PASSWORD %L IN ROLE eps_solo_lectura', :'clave_lectura')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eps_lectura') \gexec

-- Límite de conexiones por usuario (protege la instancia ante picos, ver Redes / Matemáticas).
ALTER ROLE eps_api CONNECTION LIMIT 40;
ALTER ROLE eps_lectura CONNECTION LIMIT 10;

-- Comprobación
SELECT r.rolname AS rol, r.rolcanlogin AS inicia_sesion, r.rolconnlimit AS limite_conexiones,
       array_agg(g.rolname) FILTER (WHERE g.rolname IS NOT NULL) AS pertenece_a
FROM pg_roles r
LEFT JOIN pg_auth_members m ON m.member = r.oid
LEFT JOIN pg_roles g ON g.oid = m.roleid
WHERE r.rolname LIKE 'eps_%'
GROUP BY r.rolname, r.rolcanlogin, r.rolconnlimit
ORDER BY r.rolname;

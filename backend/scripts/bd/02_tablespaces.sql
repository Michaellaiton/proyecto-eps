-- =============================================================================
-- Tablespaces separados para datos e índices (Administración de Bases de Datos).
--
-- Objetivo: que las lecturas/escrituras de tablas e índices no compitan por el mismo disco.
-- En un servidor real, cada carpeta debe estar en un disco (o volumen) distinto.
--
-- 1. Crear las carpetas y dar permiso a la cuenta del servicio de PostgreSQL
--    (en Windows: "NETWORK SERVICE" o la cuenta que muestre services.msc):
--       mkdir D:\pg\eps_datos   y   mkdir E:\pg\eps_indices
-- 2. Ejecutar como postgres:
--       psql -U postgres -d eps_citas -v ruta_datos='D:/pg/eps_datos' -v ruta_indices='E:/pg/eps_indices' -f 02_tablespaces.sql
-- 3. En backend/.env:
--       EPS_BD_TABLESPACE_DATOS=ts_eps_datos
--       EPS_BD_TABLESPACE_INDICES=ts_eps_indices
--    Django creará las tablas e índices nuevos en esos tablespaces (DEFAULT_TABLESPACE y
--    DEFAULT_INDEX_TABLESPACE en configuracion/ajustes.py).
-- 4. Para mover lo que ya existe se usan las sentencias de la sección final (bloquean la tabla
--    mientras se copian los datos: ejecutarlas en una ventana de mantenimiento).
-- =============================================================================

\set ON_ERROR_STOP on

SELECT format('CREATE TABLESPACE ts_eps_datos OWNER eps_app LOCATION %L', :'ruta_datos')
WHERE NOT EXISTS (SELECT 1 FROM pg_tablespace WHERE spcname = 'ts_eps_datos') \gexec

SELECT format('CREATE TABLESPACE ts_eps_indices OWNER eps_app LOCATION %L', :'ruta_indices')
WHERE NOT EXISTS (SELECT 1 FROM pg_tablespace WHERE spcname = 'ts_eps_indices') \gexec

-- Mover las tablas principales y sus índices (ventana de mantenimiento)
ALTER TABLE citas SET TABLESPACE ts_eps_datos;
ALTER TABLE pacientes SET TABLESPACE ts_eps_datos;
ALTER TABLE doctores SET TABLESPACE ts_eps_datos;
ALTER TABLE auditoria SET TABLESPACE ts_eps_datos;

ALTER INDEX ux_citas_franja_activa SET TABLESPACE ts_eps_indices;
ALTER INDEX ux_citas_paciente_hora_activa SET TABLESPACE ts_eps_indices;
ALTER INDEX ix_citas_doctor_fecha SET TABLESPACE ts_eps_indices;
ALTER INDEX ix_citas_paciente_fecha SET TABLESPACE ts_eps_indices;
ALTER INDEX ix_auditoria_fecha SET TABLESPACE ts_eps_indices;

-- Comprobación: dónde quedó cada objeto
SELECT c.relname AS objeto,
       CASE c.relkind WHEN 'r' THEN 'tabla' WHEN 'i' THEN 'índice' END AS tipo,
       COALESCE(t.spcname, 'pg_default') AS tablespace
FROM pg_class c
LEFT JOIN pg_tablespace t ON t.oid = c.reltablespace
WHERE c.relname IN ('citas', 'pacientes', 'doctores', 'auditoria', 'ux_citas_franja_activa',
                    'ux_citas_paciente_hora_activa', 'ix_citas_doctor_fecha', 'ix_citas_paciente_fecha', 'ix_auditoria_fecha')
ORDER BY tipo, objeto;

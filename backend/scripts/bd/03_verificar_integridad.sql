-- =============================================================================
-- Verificación de integridad de la agenda (evidencia para OBS-01 y REQ-03 del informe de Calidad).
-- Ejecutar después de una prueba de carga. Todas las consultas de la sección 1 deben devolver 0 filas.
--   psql -U eps_app -d eps_citas -f 03_verificar_integridad.sql
-- =============================================================================

\echo '1.1 Franjas con más de una cita activa (debe ser 0 filas)'
SELECT id_doctor, fecha, hora, COUNT(*) AS citas_activas
FROM citas
WHERE estado <> 'Cancelada'
GROUP BY id_doctor, fecha, hora
HAVING COUNT(*) > 1;

\echo '1.2 Pacientes con dos citas activas a la misma hora (debe ser 0 filas)'
SELECT id_paciente, fecha, hora, COUNT(*) AS citas_activas
FROM citas
WHERE estado <> 'Cancelada'
GROUP BY id_paciente, fecha, hora
HAVING COUNT(*) > 1;

\echo '1.3 Citas con estado no válido (debe ser 0 filas)'
SELECT id_cita, estado FROM citas
WHERE estado NOT IN ('Agendada', 'Cancelada', 'Atendida', 'No asistio');

\echo '1.4 Bloques de horario que se cruzan en el mismo día de un médico (debe ser 0 filas)'
SELECT a.id_doctor, a.dia_semana, a.hora_inicio, a.hora_fin, b.hora_inicio AS otro_inicio, b.hora_fin AS otro_fin
FROM horario_base a
JOIN horario_base b
  ON a.id_doctor = b.id_doctor AND a.dia_semana = b.dia_semana AND a.id_horario < b.id_horario
 AND a.hora_inicio < b.hora_fin AND b.hora_inicio < a.hora_fin;

\echo '2. Resumen informativo'
SELECT estado, COUNT(*) AS cantidad FROM citas GROUP BY estado ORDER BY estado;

\echo '3. Citas activas dentro de un bloqueo (informativo: se avisa al paciente, no es un error)'
SELECT c.id_cita, c.fecha, c.hora, b.motivo
FROM citas c
JOIN bloqueos_agenda b
  ON b.id_doctor = c.id_doctor AND b.fecha = c.fecha AND c.hora >= b.hora_inicio AND c.hora < b.hora_fin
WHERE c.estado = 'Agendada';

\echo '4. Índices que sostienen la regla de no duplicidad'
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'citas' AND indexname LIKE 'ux_%';

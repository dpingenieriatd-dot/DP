-- =========================================================================
-- Migración 08b — estado intermedio 'mostrado' para agenda_bloques
--
-- Corrige una condición de carrera encontrada probando el popup de
-- recordatorios: dos chequeos casi simultáneos (típico en modo Strict de
-- React durante desarrollo, pero en principio posible siempre con pestañas
-- múltiples) podían detectar el mismo bloque "pendiente" como debido y
-- ambos insertar una notificación duplicada en la campana.
--
-- La solución es "reclamar" el bloque con un UPDATE condicional
-- (pendiente -> mostrado) antes de notificar: solo el chequeo que
-- realmente logra cambiar la fila sigue adelante: los demás ven 0 filas
-- afectadas y se abstienen. posponerRecordatorio vuelve a dejarlo en
-- 'pendiente' para que se pueda re-reclamar después del snooze.
-- =========================================================================

alter table agenda_bloques drop constraint if exists agenda_bloques_recordatorio_estado_check;
alter table agenda_bloques add constraint agenda_bloques_recordatorio_estado_check
  check (recordatorio_estado in ('pendiente', 'mostrado', 'descartado'));

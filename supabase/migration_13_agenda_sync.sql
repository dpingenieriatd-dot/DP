-- =========================================================================
-- Migración 13 — Fase 3 de ajustes UAT: sincronización Agenda ↔ Banco de
-- tareas / Actividades
--
-- agenda_bloques gana un vínculo opcional a la tarea o actividad que lo
-- originó. El estado del bloque NO se duplica aquí — se lee en vivo de
-- tareas.estado por join, para que nunca pueda desincronizarse. El índice
-- único parcial garantiza un solo bloque por tarea/actividad (no se puede
-- duplicar el registro al tomar/reprogramar).
-- =========================================================================

alter table agenda_bloques add column if not exists tarea_id uuid references tareas(id) on delete set null;
alter table agenda_bloques add column if not exists actividad_id uuid references actividades(id) on delete set null;

-- Constraint plana (no índice parcial): Postgres ya trata NULL como distinto de NULL en un
-- unique constraint normal, así que varios bloques manuales sin tarea_id conviven sin problema.
-- Un índice único PARCIAL (where tarea_id is not null) no sirve como target de ON CONFLICT
-- para el upsert de PostgREST — probado, da error 42P10 "no unique or exclusion constraint
-- matching the ON CONFLICT specification". Se limpia cualquier índice/constraint previo con
-- estos nombres (de un intento anterior) antes de crear la versión final, para que este bloque
-- se pueda correr más de una vez sin importar en qué estado haya quedado.
alter table agenda_bloques drop constraint if exists uq_agenda_bloques_tarea;
alter table agenda_bloques drop constraint if exists uq_agenda_bloques_actividad;
drop index if exists uq_agenda_bloques_tarea;
drop index if exists uq_agenda_bloques_actividad;
alter table agenda_bloques add constraint uq_agenda_bloques_tarea unique (tarea_id);
alter table agenda_bloques add constraint uq_agenda_bloques_actividad unique (actividad_id);

-- Hora de inicio opcional al registrar una actividad manual — si se llena, crea/actualiza su bloque en Agenda.
alter table actividades add column if not exists hora time;

notify pgrst, 'reload schema';

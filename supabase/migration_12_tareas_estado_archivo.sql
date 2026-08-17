-- =========================================================================
-- Migración 12 — Fase 2 de ajustes UAT: pausar/reanudar tareas, archivar
-- restringido a admin (Directora de Proyectos)
--
-- - 'Pausada' se agrega al estado de tareas (pausa por prioridad operativa,
--   conservando el tiempo acumulado en registros_tiempo).
-- - archivado sigue el mismo patrón ya usado en proyectos/compras.
-- - Eliminar y archivar quedan restringidos a admin: se divide la política
--   única "acceso por módulo" en updates/select/insert (cualquiera con el
--   módulo) y delete (solo admin). El archivado en sí es un UPDATE, así
--   que se controla desde la Server Action (requiereAdmin), no por RLS.
-- =========================================================================

alter table tareas drop constraint if exists tareas_estado_check;
alter table tareas add constraint tareas_estado_check
  check (estado in ('Disponible', 'En proceso', 'Pausada', 'Terminada'));

alter table tareas add column if not exists archivado boolean not null default false;

drop policy if exists "seguimiento: acceso por módulo" on tareas;

create policy "seguimiento: leer/crear/editar por módulo" on tareas
  for select using (has_module('seguimiento'));
create policy "seguimiento: crear por módulo" on tareas
  for insert with check (has_module('seguimiento'));
create policy "seguimiento: editar por módulo" on tareas
  for update using (has_module('seguimiento')) with check (has_module('seguimiento'));
create policy "seguimiento: eliminar solo admin" on tareas
  for delete using (is_admin());

notify pgrst, 'reload schema';

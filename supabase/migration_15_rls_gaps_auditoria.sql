-- =========================================================================
-- Migración 15 — cierra 2 brechas de RLS encontradas en auditoría de
-- cumplimiento contra "Ajustes modulo seguimiento.docx"
--
-- 1) archivarTarea/calificarCalidad ya estaban restringidos a admin en la
--    Server Action (requiereAdmin()), pero la política RLS de UPDATE sobre
--    tareas seguía abierta a cualquier usuario con el módulo seguimiento
--    (necesario para que pausarTarea/reanudarTarea/terminarTarea funcionen
--    para cualquiera). Como las Server Actions usan la sesión del usuario
--    (anon key), no una service_role key, RLS es el límite real de
--    autorización — el chequeo en la Server Action por sí solo no alcanza.
--    Se agrega un trigger BEFORE UPDATE que bloquea cambios específicamente
--    en archivado/calidad_pct salvo que el que escribe sea admin, sin tocar
--    el resto de columnas (mismo patrón ya usado en profiles: RLS no puede
--    restringir por columna, solo por fila).
--
-- 2) registros_tiempo no tenía predicado de dueño — cualquier usuario con
--    el módulo podía iniciar/detener el cronómetro de OTRA persona vía la
--    API directa. Todo el código de la app ya consulta siempre por
--    usuario_id = el usuario logueado, así que restringir no rompe nada.
-- =========================================================================

create or replace function guard_tareas_admin_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.archivado is distinct from old.archivado or new.calidad_pct is distinct from old.calidad_pct)
     and not is_admin() then
    raise exception 'Solo un administrador (Directora de Proyectos) puede archivar o calificar la calidad de una tarea.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tareas_guard_admin_columns on tareas;
create trigger trg_tareas_guard_admin_columns
  before update on tareas
  for each row execute function guard_tareas_admin_columns();

drop policy if exists "seguimiento: acceso por módulo" on registros_tiempo;
create policy "seguimiento: propios registros de tiempo" on registros_tiempo
  for all using (has_module('seguimiento') and usuario_id = auth.uid())
  with check (has_module('seguimiento') and usuario_id = auth.uid());

notify pgrst, 'reload schema';

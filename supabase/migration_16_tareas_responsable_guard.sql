-- =========================================================================
-- Migración 16 — cierra la misma clase de brecha que migración 15, esta vez
-- para "retirar tareas del Banco de tareas" (liberarTarea). La política
-- general de UPDATE en tareas sigue abierta a cualquiera con el módulo
-- seguimiento (necesaria para tomar/pausar/reanudar/terminar), así que sin
-- este trigger cualquier usuario podría reasignar o "liberar" la tarea de
-- OTRA persona directamente por API, sin pasar por liberarTarea() ni por su
-- chequeo de dueño/admin.
--
-- Transiciones legítimas de "responsable" para un usuario no-admin:
--   - null -> auth.uid()   (tomar una tarea sin dueño)
--   - auth.uid() -> null   (soltar la propia tarea)
-- Cualquier otro cambio de responsable requiere is_admin().
-- =========================================================================

create or replace function guard_tareas_responsable()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.responsable is distinct from old.responsable then
    if not (
      (old.responsable is null and new.responsable = auth.uid())
      or (old.responsable = auth.uid() and new.responsable is null)
    ) then
      raise exception 'Solo puedes tomar una tarea sin dueño o liberar una tarea que sea tuya.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tareas_guard_responsable on tareas;
create trigger trg_tareas_guard_responsable
  before update on tareas
  for each row execute function guard_tareas_responsable();

notify pgrst, 'reload schema';

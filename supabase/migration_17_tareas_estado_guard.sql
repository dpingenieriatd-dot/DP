-- =========================================================================
-- Migración 17 — extiende guard_tareas_responsable para cubrir también
-- cambios de "estado", no solo de "responsable".
--
-- Encontrado al auditar el punto 5 del docx ("modificar el estado...
-- únicamente Directora de Proyectos"): comprobado que un usuario distinto
-- al responsable podía forzar tareas.estado (ej. "Pausada") de la tarea de
-- OTRA persona llamando la API directo, sin pasar por pausarTarea() ni
-- terminarTarea() — esos Server Actions ya fueron reforzados en el código,
-- pero sin esto la política de UPDATE de tareas (abierta a cualquiera con
-- el módulo) seguía siendo el límite real, y no distinguía dueño.
--
-- Regla para no-admin: un cambio de estado solo es válido si la persona
-- era responsable ANTES del cambio o queda como responsable DESPUÉS (esto
-- último cubre tomarTarea, que cambia responsable y estado en el mismo
-- update). is_admin() sigue sin restricción, igual que el resto de guards.
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

  if new.estado is distinct from old.estado then
    if not (old.responsable = auth.uid() or new.responsable = auth.uid()) then
      raise exception 'Solo quien tomó la tarea puede cambiar su estado.';
    end if;
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';

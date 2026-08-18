-- =========================================================================
-- Migración 18 — RLS de agenda_bloques no distingue dueño para bloques
-- ligados a una tarea (tarea_id not null).
--
-- Encontrado al auditar "Ajustes para el módulo agenda", punto 14
-- (reprogramación): reprogramarBloque() en el Server Action ya valida que
-- solo el responsable de la tarea (o admin) pueda reprogramar, pero esa
-- validación es inútil como control de seguridad real porque la política
-- de agenda_bloques ("seguimiento: acceso por módulo") sigue abierta a
-- cualquiera con el módulo — comprobado con un usuario de prueba sin
-- relación con la tarea, que reprogramó el bloque de otra persona llamando
-- la API de Supabase directo, sin pasar por el Server Action.
--
-- Los bloques manuales (tarea_id is null) siguen sin restricción de dueño
-- — es el diseño original de planeación compartida, no se toca.
-- =========================================================================

create or replace function guard_agenda_bloques_responsable()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tarea_id uuid;
  v_responsable uuid;
begin
  if is_admin() then
    return coalesce(new, old);
  end if;

  v_tarea_id := coalesce(new.tarea_id, old.tarea_id);
  if v_tarea_id is null then
    return coalesce(new, old);
  end if;

  select responsable into v_responsable from tareas where id = v_tarea_id;
  if v_responsable is distinct from auth.uid() then
    raise exception 'Solo quien tomó la tarea puede modificar su bloque de Agenda.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_agenda_bloques_guard_responsable on agenda_bloques;
create trigger trg_agenda_bloques_guard_responsable
  before update or delete on agenda_bloques
  for each row execute function guard_agenda_bloques_responsable();

notify pgrst, 'reload schema';

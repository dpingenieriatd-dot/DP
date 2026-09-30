-- =========================================================================
-- Migración 56 — Reabrir una tarea Terminada (volver a "En proceso")
--
-- El cliente pidió poder devolver a "En proceso" una tarea que alguien
-- terminó por error. Reglas acordadas:
--   * La persona responsable puede reabrir SU tarea mientras no esté
--     calificada ni archivada.
--   * La Directora de Proyectos (admin) puede reabrir cualquiera, en
--     cualquier momento: se borra la calificación y, si estaba archivada,
--     se desarchiva.
--
-- 1) actividades.tarea_id: al terminar una tarea se inserta un registro
--    "Cumplido" en actividades, pero sin decir de qué tarea venía. Al
--    reabrir hay que borrarlo (si no, contaría doble al volver a
--    terminarla), así que se agrega la referencia y se enlazan los cierres
--    históricos que coincidan sin ambigüedad (mismo título, responsable y
--    fecha de cierre; exactamente un registro por tarea y viceversa). Los
--    que no coincidan quedan sin enlace.
--
-- 2) tareas.reabierta_*: quién, cuándo y por qué se reabrió por última vez,
--    y cuántas veces. Se muestra en el detalle de la tarea.
--
-- 3) guard_tareas_admin_columns: además de archivar/calificar (solo admin),
--    bloquea que un no-admin saque de "Terminada" una tarea ya calificada o
--    archivada llamando la API directo (el Server Action ya lo valida, pero
--    RLS/trigger es el límite real, ver migración 15).
-- =========================================================================

alter table actividades add column if not exists tarea_id uuid references tareas(id) on delete set null;
create index if not exists idx_actividades_tarea_id on actividades (tarea_id);

with candidatos as (
  select a.id as actividad_id, t.id as tarea_id
  from actividades a
  join tareas t
    on t.estado = 'Terminada'
   and a.origen = 'Banco de tareas'
   and a.tarea_id is null
   and a.actividad = t.titulo
   and a.fecha = t.fecha_cierre
   and a.usuario_id is not distinct from t.responsable
),
unicos as (
  select c.*
  from candidatos c
  where (select count(*) from candidatos c2 where c2.actividad_id = c.actividad_id) = 1
    and (select count(*) from candidatos c3 where c3.tarea_id = c.tarea_id) = 1
)
update actividades a
set tarea_id = u.tarea_id
from unicos u
where a.id = u.actividad_id;

alter table tareas add column if not exists reabierta_at timestamptz;
alter table tareas add column if not exists reabierta_por uuid references profiles(id);
alter table tareas add column if not exists reabierta_motivo text;
alter table tareas add column if not exists reabierta_veces integer not null default 0;

create or replace function guard_tareas_admin_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;

  if new.archivado is distinct from old.archivado or new.calidad_pct is distinct from old.calidad_pct then
    raise exception 'Solo un administrador (Directora de Proyectos) puede archivar o calificar la calidad de una tarea.';
  end if;

  if old.estado = 'Terminada' and new.estado is distinct from old.estado
     and (old.archivado or old.calidad_pct is not null) then
    raise exception 'Esta tarea ya fue calificada o archivada: solo la Directora de Proyectos puede reabrirla.';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';

-- =========================================================================
-- Migración 08 — Notificaciones (campana) + recordatorios de Agenda
-- Pegar completo en el SQL Editor de Supabase y correr una sola vez.
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1. Preferencias de recordatorio por persona
-- ---------------------------------------------------------------------
alter table profiles add column if not exists recordatorio_minutos_antes int not null default 15;
alter table profiles add column if not exists recordatorio_sonido boolean not null default true;

-- No existe (a propósito) una política RLS que deje a cada usuario editar su
-- propia fila de profiles completa (ver schema.sql: evita que alguien se
-- autoasigne role='admin'). Esta función permite, sin abrir esa puerta,
-- que cada quien edite SOLO sus dos columnas de preferencia de recordatorio
-- en SU PROPIA fila — mismo patrón que is_admin()/has_module() (security
-- definer + auth.uid() acotando el alcance).
create or replace function actualizar_preferencias_recordatorio(p_minutos int, p_sonido boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles
  set recordatorio_minutos_antes = greatest(0, p_minutos),
      recordatorio_sonido = p_sonido
  where id = auth.uid();
end;
$$;
grant execute on function actualizar_preferencias_recordatorio(int, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Estado del recordatorio por bloque de agenda (uno por bloque, ya que
--    cada bloque pertenece a una sola persona vía usuario_id).
-- ---------------------------------------------------------------------
alter table agenda_bloques add column if not exists recordatorio_estado text not null default 'pendiente'
  check (recordatorio_estado in ('pendiente', 'descartado'));
alter table agenda_bloques add column if not exists recordatorio_snooze_hasta timestamptz;

create index if not exists idx_agenda_bloques_recordatorio on agenda_bloques (usuario_id, dia, recordatorio_estado);

-- ---------------------------------------------------------------------
-- 3. Notificaciones (campana)
-- ---------------------------------------------------------------------
create table if not exists notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  tipo text not null default 'general',
  titulo text not null,
  mensaje text,
  enlace text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notificaciones_usuario on notificaciones (usuario_id, leida, created_at desc);

alter table notificaciones enable row level security;

drop policy if exists "notificaciones: leer las propias" on notificaciones;
create policy "notificaciones: leer las propias" on notificaciones
  for select using (usuario_id = auth.uid());

-- Cualquier usuario autenticado puede crear una notificación (incluso para
-- otra persona, ej. "X tomó tu tarea" lo dispara quien toma la tarea, no el
-- destinatario) — mismo criterio de confianza interna que el resto del
-- esquema (ver [[feedback-account-separation]]-style: app interna, no expuesta
-- a terceros).
drop policy if exists "notificaciones: cualquiera autenticado crea" on notificaciones;
create policy "notificaciones: cualquiera autenticado crea" on notificaciones
  for insert with check (auth.uid() is not null);

drop policy if exists "notificaciones: marcar como leidas las propias" on notificaciones;
create policy "notificaciones: marcar como leidas las propias" on notificaciones
  for update using (usuario_id = auth.uid());

-- =========================================================================
-- Migración 45 — Soporte técnico
--
-- Sección en Administración para reportar problemas de la plataforma
-- (solo Angélica/admin reporta y gestiona, mismo patrón que auditoria/
-- parámetros). Al crear un ticket se envía un correo automático al
-- desarrollador vía Resend (ver src/app/(app)/admin/soporte/actions.ts).
-- =========================================================================

create table if not exists soporte_tickets (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null,
  urgencia text not null default 'Media' check (urgencia in ('Baja', 'Media', 'Alta')),
  estado text not null default 'Abierto' check (estado in ('Abierto', 'En revisión', 'Resuelto')),
  pagina text,
  respuesta text,
  creado_por uuid references profiles(id),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

create index if not exists idx_soporte_tickets_estado on soporte_tickets (estado, creado_en desc);

alter table soporte_tickets enable row level security;

-- Mismo patrón que auditoria/settings: toda la sección vive bajo
-- Administración, así que solo is_admin() necesita acceso (lectura Y
-- escritura, a diferencia de auditoria que solo se lee).
drop policy if exists "soporte_tickets: solo admin" on soporte_tickets;
create policy "soporte_tickets: solo admin" on soporte_tickets
  for all using (is_admin()) with check (is_admin());

notify pgrst, 'reload schema';

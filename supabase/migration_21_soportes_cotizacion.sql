-- =========================================================================
-- Migración 21 — Soportes de cotización (Fase 7), primer uso de Supabase
-- Storage en el proyecto.
--
-- Bucket privado (no público): los archivos solo se sirven vía URL firmada
-- de corta duración generada server-side, nunca por URL pública directa.
-- Igual que el resto de la app, el aislamiento real es RLS por módulo
-- ('gestion'), no la privacidad del bucket por sí sola.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('cotizacion-soportes', 'cotizacion-soportes', false)
on conflict (id) do nothing;

drop policy if exists "gestion: leer soportes de cotización" on storage.objects;
create policy "gestion: leer soportes de cotización" on storage.objects
  for select using (bucket_id = 'cotizacion-soportes' and has_module('gestion'));

drop policy if exists "gestion: subir soportes de cotización" on storage.objects;
create policy "gestion: subir soportes de cotización" on storage.objects
  for insert with check (bucket_id = 'cotizacion-soportes' and has_module('gestion'));

drop policy if exists "gestion: eliminar soportes de cotización" on storage.objects;
create policy "gestion: eliminar soportes de cotización" on storage.objects
  for delete using (bucket_id = 'cotizacion-soportes' and has_module('gestion'));

create table if not exists cotizacion_soportes (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references cotizaciones(id) on delete cascade,
  nombre_archivo text not null,
  storage_path text not null,
  subido_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table cotizacion_soportes enable row level security;
drop policy if exists "gestion: acceso por módulo" on cotizacion_soportes;
create policy "gestion: acceso por módulo" on cotizacion_soportes
  for all using (has_module('gestion')) with check (has_module('gestion'));

notify pgrst, 'reload schema';

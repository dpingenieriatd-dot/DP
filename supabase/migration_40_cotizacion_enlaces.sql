-- =========================================================================
-- Migración 40 — Cotizaciones: enlaces en vez de archivos subidos
--
-- Antes: los soportes de la cotización se subían a un bucket de Supabase
-- Storage (cotizacion_soportes + bucket 'cotizacion-soportes'). Para no
-- llenar el storage, ahora se guardan enlaces (SharePoint u otros): hasta
-- 10 por cotización, con título opcional y URL, clickeables.
--
-- El bucket y la tabla de soportes se eliminan — estaban vacíos (0 archivos,
-- 0 registros) al momento de esta migración.
-- =========================================================================

create table if not exists cotizacion_enlaces (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references cotizaciones(id) on delete cascade,
  titulo text,
  url text not null,
  orden int not null default 0,
  creado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists cotizacion_enlaces_cotizacion_id_idx on cotizacion_enlaces(cotizacion_id);

alter table cotizacion_enlaces enable row level security;
drop policy if exists "gestion: acceso por módulo" on cotizacion_enlaces;
create policy "gestion: acceso por módulo" on cotizacion_enlaces
  for all using (has_module('gestion')) with check (has_module('gestion'));

-- Tope de 10 enlaces por cotización (defensa en BD además de la validación
-- en la Server Action).
create or replace function cotizacion_enlaces_max_10()
returns trigger language plpgsql as $$
begin
  if (select count(*) from cotizacion_enlaces where cotizacion_id = new.cotizacion_id) >= 10 then
    raise exception 'Máximo 10 enlaces por cotización.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cotizacion_enlaces_max_10 on cotizacion_enlaces;
create trigger trg_cotizacion_enlaces_max_10 before insert on cotizacion_enlaces
  for each row execute function cotizacion_enlaces_max_10();

-- Fuera la tabla de soportes por archivo (estaba vacía).
drop table if exists cotizacion_soportes;

-- El bucket 'cotizacion-soportes' y sus políticas quedan huérfanos pero
-- inofensivos (0 archivos). Supabase NO permite borrar storage.objects /
-- storage.buckets desde SQL ("Direct deletion from storage tables is not
-- allowed"). Para limpiarlo del todo, borrar el bucket a mano en el
-- Dashboard: Storage → cotizacion-soportes → Delete bucket. Opcional.

notify pgrst, 'reload schema';

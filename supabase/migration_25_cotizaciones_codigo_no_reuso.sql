-- Ajustes Fase 2 (Gestión): "no puede tomar códigos anteriores" — el UNIQUE en
-- cotizaciones.codigo solo evita duplicados mientras la fila exista; si se borra o
-- se le cambia el código a una cotización, ese código queda libre para reusarse.
-- Esta tabla guarda cada código que quedó "liberado" (por borrado o por cambio de
-- código) para que nunca se pueda volver a usar, ni siquiera en una cotización nueva.
create table if not exists cotizaciones_codigos_usados (
  codigo text primary key,
  usado_en timestamptz not null default now()
);

alter table cotizaciones_codigos_usados enable row level security;
drop policy if exists "gestion: acceso por módulo" on cotizaciones_codigos_usados;
create policy "gestion: acceso por módulo" on cotizaciones_codigos_usados
  for all using (has_module('gestion')) with check (has_module('gestion'));

create or replace function guardar_codigo_cotizacion_liberado()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  codigo_viejo text;
begin
  if TG_OP = 'DELETE' then
    codigo_viejo := old.codigo;
  else
    if new.codigo is distinct from old.codigo then
      codigo_viejo := old.codigo;
    else
      codigo_viejo := null;
    end if;
  end if;

  if codigo_viejo is not null then
    insert into cotizaciones_codigos_usados (codigo) values (codigo_viejo)
    on conflict (codigo) do nothing;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_cotizaciones_codigo_liberado on cotizaciones;
create trigger trg_cotizaciones_codigo_liberado
  before update or delete on cotizaciones
  for each row execute function guardar_codigo_cotizacion_liberado();

notify pgrst, 'reload schema';

-- Migration 06: tema visual de la app (selector de paleta de colores)
--
-- Tabla de una sola fila con el tema elegido. Lectura publica (no es dato
-- sensible, solo controla que paleta de colores se pinta) para que hasta
-- la pantalla de login respete el tema antes de autenticarse; escritura
-- solo para administradores.

create table if not exists app_config (
  id int primary key default 1 check (id = 1),
  tema text not null default 'verde' check (tema in ('verde', 'azul')),
  updated_at timestamptz not null default now()
);
insert into app_config (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_app_config_updated_at on app_config;
create trigger trg_app_config_updated_at before update on app_config
  for each row execute function set_updated_at();

alter table app_config enable row level security;

drop policy if exists "app_config: lectura publica" on app_config;
create policy "app_config: lectura publica" on app_config
  for select using (true);

drop policy if exists "app_config: solo admin edita" on app_config;
create policy "app_config: solo admin edita" on app_config
  for update using (is_admin());

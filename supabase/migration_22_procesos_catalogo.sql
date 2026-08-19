-- =========================================================================
-- Migración 22 — Catálogo de procesos (módulo "Procesos" de Seguimiento).
--
-- Fuente: Lista-de-procesos.xlsx del cliente (hoja "Procesos" = 13 procesos
-- incl. GD/Gestión Documental transversal; hoja "Subprocesos" = 95
-- actividades). Los datos se insertan aparte vía script (no en esta
-- migración) — aquí solo se crea la estructura.
--
-- 3 conflictos del propio Excel resueltos con un default documentado
-- (pendiente de confirmar con Angélica, no bloquea):
--  - A05 usa nombre/categoría de la hoja "Procesos" (Apoyo), no la de
--    "Subprocesos" (que dice "Misional Transversal").
--  - Las 2 filas "Gestión documental y soportes operativos" de A01 se
--    guardan como 2 actividades distintas (tienen descripción distinta).
--  - GD queda como proceso sin actividades (es codificación documental,
--    no un proceso operativo con tareas).
-- =========================================================================

create table if not exists procesos (
  codigo text primary key,
  nombre text not null,
  categoria text not null check (categoria in ('Transversal', 'Estratégico', 'Misional', 'Apoyo'))
);

create table if not exists catalogo_actividades (
  id uuid primary key default gen_random_uuid(),
  codigo text not null references procesos(codigo),
  subproceso text not null,
  descripcion text,
  responsable_sugerido text,
  periodicidad_sugerida text,
  resultado_esperado text,
  personalizada boolean not null default false,
  creada_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table procesos enable row level security;
alter table catalogo_actividades enable row level security;

drop policy if exists "seguimiento: leer procesos" on procesos;
create policy "seguimiento: leer procesos" on procesos
  for select using (has_module('seguimiento'));

drop policy if exists "seguimiento: acceso por módulo" on catalogo_actividades;
create policy "seguimiento: acceso por módulo" on catalogo_actividades
  for all using (has_module('seguimiento')) with check (has_module('seguimiento'));

alter table tareas add column if not exists catalogo_actividad_id uuid references catalogo_actividades(id) on delete set null;
alter table tareas add column if not exists proceso_codigo text references procesos(codigo);

notify pgrst, 'reload schema';

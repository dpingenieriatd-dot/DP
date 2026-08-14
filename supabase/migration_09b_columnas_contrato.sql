-- =========================================================================
-- Migración 09b — asegurar columnas de contrato en proyectos
--
-- El error "Could not find the 'contrato_incluye_iva' column... in the
-- schema cache" al probar el nuevo cálculo de efectivo neto esperado
-- indica que esta columna (y posiblemente otras del mismo grupo) nunca
-- se creó en la base de datos en vivo, aunque sí estaba en schema.sql del
-- repositorio. IF NOT EXISTS hace esto seguro de correr sin importar cuáles
-- de estas columnas ya existan.
-- =========================================================================

alter table proyectos add column if not exists contrato_valor numeric not null default 0;
alter table proyectos add column if not exists iva_aplica boolean not null default false;
alter table proyectos add column if not exists iva_pct numeric not null default 19;
alter table proyectos add column if not exists contrato_incluye_iva boolean not null default true;
alter table proyectos add column if not exists retencion_pct numeric not null default 0;
alter table proyectos add column if not exists ica_pct numeric not null default 0;
alter table proyectos add column if not exists otras_retenciones numeric not null default 0;

notify pgrst, 'reload schema';

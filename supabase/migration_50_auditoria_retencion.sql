-- =========================================================================
-- Migración 50 — Auditoría: retención de 12 meses
--
-- Limpieza automática nocturna (pg_cron, corre dentro de la base de datos,
-- no toca la app ni Vercel): borra los registros de auditoría con más de
-- 12 meses. El volumen real es bajo (~15-20 MB al año), así que 12 meses
-- deja la tabla chica y la lista manejable sin perder el historial útil
-- para revisiones anuales o disputas.
--
-- Si "create extension pg_cron" falla por permisos, habilitá pg_cron en
-- Supabase: Dashboard -> Database -> Extensions -> pg_cron, y volvé a
-- correr esta migración.
-- =========================================================================

create extension if not exists pg_cron;

-- Índice para que el DELETE nocturno (y el "últimos 300" de la página)
-- no tengan que escanear toda la tabla.
create index if not exists idx_auditoria_creado_en on auditoria (creado_en desc);

-- Idempotente: si el job ya existe, lo quita antes de volver a crearlo.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'auditoria-retencion-12m') then
    perform cron.unschedule('auditoria-retencion-12m');
  end if;
end $$;

select cron.schedule(
  'auditoria-retencion-12m',
  '30 3 * * *', -- todos los días a las 3:30 AM
  $$ delete from auditoria where creado_en < now() - interval '12 months' $$
);

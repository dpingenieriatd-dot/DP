-- =========================================================================
-- Migración 32 — El formulario de cotizaciones (paridad con HTML, migración
-- 31) usa "Pendiente por definir" como uno de los 5 estados del select
-- "Estado de la cotización", pero el check constraint de la tabla nunca
-- incluyó ese valor — lo detectó el primer guardado real de prueba.
-- =========================================================================

alter table cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table cotizaciones add constraint cotizaciones_estado_check
  check (estado in ('Borrador', 'Pendiente por definir', 'Enviada', 'Aprobada', 'Rechazada', 'Cancelada')) not valid;

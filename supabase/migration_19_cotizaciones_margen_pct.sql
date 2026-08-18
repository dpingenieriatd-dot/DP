-- =========================================================================
-- Migración 19 — margen de utilidad editable por cotización.
--
-- Hasta ahora el 30% de margen estaba fijo en el código (admin_pct 15% e
-- iva_pct 19% siguen fijos, no se pidió cambiarlos). Cesar pidió poder
-- ajustar el margen "según conveniencia" al hacer cada cotización.
-- =========================================================================

alter table cotizaciones add column if not exists margen_pct numeric not null default 30;

notify pgrst, 'reload schema';

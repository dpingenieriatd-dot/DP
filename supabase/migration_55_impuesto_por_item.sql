-- =========================================================================
-- Migración 55 — Impuesto (IVA o impoconsumo) editable por ítem
--
-- Antes: el IVA era una tarifa fija de 19% para toda la cotización y cada
-- ítem solo tenía la casilla `lleva_iva` (sí/no). El cliente pidió que, al
-- crear una cotización, cada ítem pueda elegir qué impuesto lleva —IVA o
-- impoconsumo, nunca los dos— y que la tarifa se escriba a mano, porque no
-- todos los servicios pagan lo mismo (ej. servicios psicológicos con IVA al
-- 5% en un caso e impoconsumo al 8% en otro).
--
-- `cotizacion_items.lleva_iva` (boolean) se reemplaza por:
--   tipo_impuesto  ('iva' | 'impoconsumo' | 'ninguno')
--   tarifa_impuesto (numeric, %, manual)
--
-- `resp_iva` en cotizaciones sigue como interruptor maestro del IVA: si está
-- en falso, ningún ítem "iva" cobra, sin importar su tarifa. El impoconsumo
-- no depende de ese interruptor.
--
-- El impoconsumo efectivo (monto ya calculado) se guarda en
-- cotizaciones.impoconsumo_monto y se propaga a presupuestos.impoconsumo_monto
-- —igual que ya pasaba con iva_monto (migration_41)— para que la utilidad y
-- la ganancia de proyectos no cuenten el impoconsumo como ingreso propio.
-- =========================================================================

-- 1. Columnas nuevas de cotizacion_items, primero sin default/constraint para
--    poder backfillear ítems existentes según su `lleva_iva` actual.
alter table cotizacion_items add column if not exists tipo_impuesto text;
alter table cotizacion_items add column if not exists tarifa_impuesto numeric;

update cotizacion_items
set tipo_impuesto = case when coalesce(lleva_iva, true) then 'iva' else 'ninguno' end,
    tarifa_impuesto = case when coalesce(lleva_iva, true) then 19 else 0 end
where tipo_impuesto is null;

alter table cotizacion_items alter column tipo_impuesto set default 'iva';
alter table cotizacion_items alter column tipo_impuesto set not null;
alter table cotizacion_items alter column tarifa_impuesto set default 19;
alter table cotizacion_items alter column tarifa_impuesto set not null;
alter table cotizacion_items add constraint cotizacion_items_tipo_impuesto_check
  check (tipo_impuesto in ('iva', 'impoconsumo', 'ninguno'));

alter table cotizacion_items drop column if exists lleva_iva;

-- 2. Impoconsumo efectivo de la cotización (mismo patrón que iva_monto).
alter table cotizaciones add column if not exists impoconsumo_monto numeric not null default 0;
alter table presupuestos add column if not exists impoconsumo_monto numeric;

-- Cotizaciones/presupuestos existentes: ningún ítem viejo tenía impoconsumo
-- (todos backfilleados arriba a 'iva' o 'ninguno'), así que 0 es correcto.

notify pgrst, 'reload schema';

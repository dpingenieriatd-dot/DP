-- =========================================================================
-- Migración 54 — Retención en la fuente e ICA editables por cotización
--
-- Antes: la caja "Efectivo neto esperado" del formulario de cotización
-- tomaba la retención en la fuente (%) y la tarifa de ICA (por mil) de la
-- ficha del cliente y no se podían cambiar. Pero no siempre se retiene lo
-- mismo ni aplica la misma tarifa de ICA para todas las cotizaciones de un
-- mismo cliente.
--
-- Ahora cada cotización guarda su propia retención en la fuente e ICA. Al
-- elegir el cliente el formulario prellena esos campos con los de su ficha
-- (Clientes > editar) y se pueden ajustar para esa cotización puntual sin
-- tocar el catálogo — mismo patrón que admin_pct / margen_pct.
--
-- NULL = cotización vieja anterior a esta migración: el formulario cae de
-- vuelta al valor de la ficha del cliente.
-- =========================================================================

alter table cotizaciones add column if not exists retencion_fuente_pct numeric;
alter table cotizaciones add column if not exists ica_por_mil numeric;

-- Las cotizaciones que ya existen quedan con lo que tenga la ficha de su
-- cliente al momento de correr la migración (0 si el cliente no tiene dato).
update cotizaciones c
  set retencion_fuente_pct = coalesce((select cl.retencion_fuente_pct from clientes cl where cl.id = c.cliente_id), 0),
      ica_por_mil          = coalesce((select cl.ica_por_mil          from clientes cl where cl.id = c.cliente_id), 0)
  where c.retencion_fuente_pct is null or c.ica_por_mil is null;

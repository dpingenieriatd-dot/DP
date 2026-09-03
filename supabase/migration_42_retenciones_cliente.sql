-- =========================================================================
-- Migración 42 — Retenciones al cliente; efectivo neto desde la cotización
--
-- Antes: "Contrato y retenciones" vivía en la ficha del proyecto y había que
-- teclear a mano el valor del contrato (que es el valor cotizado) y los
-- porcentajes de retención en cada proyecto.
--
-- Ahora: la retención en la fuente y la tarifa de ICA son parte del perfil
-- tributario del CLIENTE (el mismo cliente aplica lo mismo en toda cotización)
-- y viven en su ficha. El efectivo neto esperado se calcula en la cotización,
-- desde el valor cotizado, el IVA efectivo, las tarifas del cliente y unas
-- "otras retenciones" fijas por cotización.
--
-- Las columnas de contrato en `proyectos` quedan (por ahora) para no perder
-- datos históricos, pero ya no se usan ni se editan desde la app.
-- =========================================================================

alter table clientes add column if not exists retencion_fuente_pct numeric not null default 0;
alter table clientes add column if not exists ica_por_mil numeric not null default 0;

alter table cotizaciones add column if not exists otras_retenciones numeric not null default 0;

-- Sembrar el perfil del cliente con lo que ya estuviera cargado en alguno de
-- sus proyectos (toma el valor máximo distinto de cero entre sus proyectos).
update clientes c set
  retencion_fuente_pct = coalesce((
    select max(p.retencion_pct) from proyectos p
    where p.cliente_id = c.id and coalesce(p.retencion_pct, 0) > 0
  ), 0),
  ica_por_mil = coalesce((
    select max(p.ica_pct) from proyectos p
    where p.cliente_id = c.id and coalesce(p.ica_pct, 0) > 0
  ), 0);

notify pgrst, 'reload schema';

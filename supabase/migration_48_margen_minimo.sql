-- =========================================================================
-- Migración 48 — Margen mínimo recomendado
--
-- Antes: "viable" solo significaba "no pierde plata" (utilidad >= 0). Una
-- cotización con $1 de ganancia salía "viable". Ahora hay un margen mínimo
-- recomendado: si la cotización queda por debajo, al guardar aparece un
-- aviso recomendando revisar los precios (no bloquea).
--
-- El valor por defecto vive en settings (editable en Administración >
-- Parámetros); cada cotización lo hereda al crearse y lo puede ajustar
-- para ese caso puntual, igual que admin_pct / margen_pct.
-- =========================================================================

alter table settings add column if not exists margen_minimo_pct numeric not null default 15;

alter table cotizaciones add column if not exists margen_minimo_pct numeric;

-- Las cotizaciones que ya existen quedan con el valor global vigente.
update cotizaciones
  set margen_minimo_pct = (select margen_minimo_pct from settings where id = 1)
  where margen_minimo_pct is null;

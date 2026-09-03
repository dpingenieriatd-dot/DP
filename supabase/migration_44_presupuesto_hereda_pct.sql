-- =========================================================================
-- Migración 44 — El presupuesto hereda admin % / margen % / IVA % de su
-- cotización
--
-- Bug: aprobarYCrearProyecto creaba el presupuesto sin copiar admin_pct,
-- margen_pct ni iva_pct, así que nacía con los defaults de la BD (15 / 30 /
-- 19) sin importar lo que usó la cotización. `calcularPresupuesto` calculaba
-- entonces admin, el "valor a tarifa", el IVA y la viabilidad con los %
-- equivocados — y el mismo `admin` mal calculado se restaba en la ganancia
-- estimada y real del proyecto.
--
-- Evidencia: COT-517 cotizó con admin 0 % → su presupuesto tenía admin 15 %
-- (inventaba ~2,3 M de costo administrativo). COT-532 cotizó con margen
-- 43,06 % → su presupuesto tenía margen 30 %.
--
-- Esta migración alinea los presupuestos existentes con su cotización. NO
-- toca `valor_cotizado` (esa divergencia es una decisión de negocio abierta:
-- ¿manda la cotización congelada o el presupuesto editable?).
-- =========================================================================

update presupuestos p set
  admin_pct  = coalesce(c.admin_pct, 15),
  margen_pct = coalesce(c.margen_pct, 30),
  iva_pct    = 19
from cotizaciones c
where p.cotizacion_id = c.id;

-- Alinear el campo `costos` con la suma real de las líneas del plan de costos
-- (algunos presupuestos lo tenían en 0 aunque sus líneas sí sumaban).
update presupuestos p set costos = sub.total
from (
  select presupuesto_id, sum(coalesce(presupuestado, 0)) as total
  from presupuesto_costos
  group by presupuesto_id
) sub
where sub.presupuesto_id = p.id and sub.total > 0;

notify pgrst, 'reload schema';

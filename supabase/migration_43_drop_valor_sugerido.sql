-- =========================================================================
-- Migración 43 — Cotizaciones: fuera "valor sugerido"
--
-- El "valor sugerido" era el precio "a tarifa" (costo × factor + IVA). Como
-- las cotizaciones se arman con precios reales por ítem (que pueden estar por
-- encima o por debajo de esa tarifa), el número no aportaba: lo que vale es
-- el valor cotizado. Se elimina de la lista, del presupuesto y del reporte,
-- y "viable" pasa a medirse contra el valor cotizado (cubre costo directo +
-- administración + IVA → no da pérdida).
-- =========================================================================

alter table cotizaciones drop column if exists valor_sugerido;

notify pgrst, 'reload schema';

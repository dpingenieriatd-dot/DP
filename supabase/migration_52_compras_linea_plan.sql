-- =========================================================================
-- Migración 52 — Fase 2.1: vincular cada compra a una línea del plan de costos
--
-- Con Fase 1 la compra ya pertenece a un presupuesto. Ahora, opcionalmente,
-- puede apuntar además a un ítem concreto del plan de costos de ese
-- presupuesto. Eso permite ver la desviación por línea (presupuestado vs.
-- comprometido) y no solo el total.
--
-- Es opcional: una compra sin línea es un "gasto no planeado" y sigue
-- contando en el total del presupuesto.
-- =========================================================================

alter table compras add column if not exists presupuesto_costo_id uuid references presupuesto_costos(id) on delete set null;

create index if not exists idx_compras_presupuesto_costo on compras (presupuesto_costo_id);

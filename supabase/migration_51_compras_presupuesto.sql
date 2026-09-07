-- =========================================================================
-- Migración 51 — Fase 1 de la conexión Compras <-> Presupuestos
--
-- Hasta ahora una compra solo apuntaba a un proyecto. El "costo real" de un
-- presupuesto sumaba TODAS las compras del proyecto, así que en proyectos
-- con varios presupuestos el gasto se contaba completo en cada uno.
--
-- Se agrega compras.presupuesto_id para que cada compra pertenezca a un
-- presupuesto concreto. El backfill asigna las compras existentes al único
-- presupuesto del proyecto cuando hay uno solo; las de proyectos con varios
-- quedan sin asignar y el formulario pedirá elegir.
-- =========================================================================

alter table compras add column if not exists presupuesto_id uuid references presupuestos(id) on delete set null;

create index if not exists idx_compras_presupuesto on compras (presupuesto_id);

-- Backfill: proyecto con exactamente un presupuesto -> esa compra es de ese presupuesto.
update compras c
set presupuesto_id = p.id
from presupuestos p
where p.proyecto_id = c.proyecto_id
  and c.presupuesto_id is null
  and (select count(*) from presupuestos p2 where p2.proyecto_id = c.proyecto_id) = 1;

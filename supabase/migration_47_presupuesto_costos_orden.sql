-- =========================================================================
-- Migración 47 — Orden explícito en el Plan de costos del presupuesto
--
-- Bug: los ítems se veían "saltar" de posición al editarlos (ej. al llenar
-- el Proveedor de un ítem que lo tenía en blanco). Causa real: la lista se
-- ordenaba solo por created_at, y los ítems sembrados al aprobar una
-- cotización se insertan TODOS en una sola sentencia -- Postgres evalúa
-- now() una sola vez por sentencia, así que quedan con el MISMO created_at.
-- Sin otro criterio de desempate, cualquier UPDATE (que en Postgres crea una
-- versión física nueva de la fila) podía cambiar el orden en que esa fila
-- volvía a aparecer. La solución es un número de orden propio, igual al que
-- ya tiene cotizacion_items.
-- =========================================================================

alter table presupuesto_costos add column if not exists orden integer not null default 0;

-- Backfill: numera lo que ya existe en el orden en que aparece hoy
-- (created_at, y de ahí el id como desempate estable) para no reordenar
-- visualmente nada de lo que ya está cargado.
with numerados as (
  select id, row_number() over (partition by presupuesto_id order by created_at, id) - 1 as rn
  from presupuesto_costos
)
update presupuesto_costos p set orden = n.rn from numerados n where n.id = p.id;

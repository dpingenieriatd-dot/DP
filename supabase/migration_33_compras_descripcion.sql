-- =========================================================================
-- Migración 33 — Compras: el HTML de referencia pide una "Descripción del
-- producto / servicio" escrita a mano en cada compra (obligatoria,
-- independiente de si se linkea o no a un insumo del catálogo) y un campo
-- opcional "Servicio profesional (si aplica)". La tabla compras no tenía
-- ninguno de los dos — el formulario actual solo mostraba la descripción
-- del insumo enlazado, así que una compra sin insumo quedaba sin
-- descripción visible.
-- =========================================================================

alter table compras add column if not exists descripcion text;
alter table compras add column if not exists servicio text;

-- Backfill no destructivo: las compras existentes que ya estaban enlazadas
-- a un insumo heredan su descripción como punto de partida editable.
update compras
set descripcion = insumos.descripcion
from insumos
where compras.insumo_id = insumos.id
  and compras.descripcion is null;

notify pgrst, 'reload schema';

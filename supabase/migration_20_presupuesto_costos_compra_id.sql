-- =========================================================================
-- Migración 20 — evita duplicar costos al reimportar Compras.
--
-- "Importar desde Compras" insertaba TODAS las compras del proyecto como
-- filas nuevas en presupuesto_costos cada vez que se hacía clic, sin
-- ninguna forma de saber cuáles ya se habían traído — un segundo clic (por
-- ejemplo, después de registrar una compra nueva) duplicaba todas las
-- anteriores. Se agrega compra_id para poder detectar y saltar las que ya
-- están, y solo traer las compras nuevas.
-- =========================================================================

alter table presupuesto_costos add column if not exists compra_id uuid references compras(id) on delete set null;

notify pgrst, 'reload schema';

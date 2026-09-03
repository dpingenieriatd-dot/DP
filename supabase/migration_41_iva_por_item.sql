-- =========================================================================
-- Migración 41 — IVA por ítem en la cotización
--
-- Antes: el IVA era un solo interruptor de toda la cotización (resp_iva) y se
-- aplicaba al 100% del subtotal. Hay ítems que llevan IVA y otros que no
-- (viáticos, transporte, ciertos servicios), así que ahora cada ítem tiene su
-- casilla `lleva_iva` y el IVA se calcula solo sobre los ítems gravados.
--
-- `resp_iva` sigue como interruptor maestro ("D&P responde por IVA"): si está
-- en falso, no hay IVA sin importar las casillas de los ítems.
--
-- El IVA efectivo (monto ya calculado) se guarda en cotizaciones.iva_monto y
-- se propaga al presupuesto (presupuestos.iva_monto) para que el control de
-- rentabilidad no vuelva a estimar un 19% sobre todo.
-- =========================================================================

alter table cotizacion_items add column if not exists lleva_iva boolean not null default true;
alter table cotizaciones add column if not exists iva_monto numeric not null default 0;
alter table presupuestos add column if not exists iva_monto numeric;

-- Ítems existentes: conservar el comportamiento actual. Si la cotización no
-- responde IVA, ninguno de sus ítems lo lleva; si responde, todos (era el
-- caso antes de esta migración). Así el valor_cotizado guardado no cambia.
update cotizacion_items ci
set lleva_iva = coalesce(c.resp_iva, false)
from cotizaciones c
where ci.cotizacion_id = c.id;

-- IVA efectivo de las cotizaciones existentes: el que ya está embebido en
-- valor_cotizado (valor_cotizado = subtotal + IVA, con IVA = subtotal*0.19
-- cuando resp_iva).
update cotizaciones
set iva_monto = case
  when coalesce(resp_iva, false) and valor_cotizado > 0
    then round((valor_cotizado - valor_cotizado / 1.19)::numeric, 2)
  else 0
end;

update presupuestos p
set iva_monto = c.iva_monto
from cotizaciones c
where p.cotizacion_id = c.id;

notify pgrst, 'reload schema';

-- =========================================================================
-- Migración 31 — Cotizaciones: motor de ítems por catálogo (paridad con HTML)
--
-- Antes: el valor cotizado se calculaba con campos agregados (personas × valor
-- unitario + horas × valor hora + costos estimados). El HTML de referencia
-- arma el precio sumando ítems individuales tomados de Insumos/Profesionales/
-- Materiales, cada uno con su costo interno y su precio cliente (ajustable a
-- mano por ítem). Esta migración agrega esa tabla de ítems y los campos de la
-- cotización que el HTML sí tiene y la app no (vigencia, contacto de
-- seguimiento, textos para la propuesta del cliente).
--
-- Las cotizaciones existentes se migran a un ítem equivalente único que
-- preserva exactamente el valor_cotizado ya guardado (sin duplicar IVA).
-- =========================================================================

create table if not exists cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references cotizaciones(id) on delete cascade,
  tipo text not null check (tipo in ('insumo', 'profesional', 'material')),
  descripcion text not null,
  unidad text not null default 'unidad',
  cantidad numeric not null default 1,
  costo_unitario numeric not null default 0,
  precio_cliente_override numeric,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cotizacion_items_cotizacion_id_idx on cotizacion_items(cotizacion_id);

alter table cotizacion_items enable row level security;
drop policy if exists "gestion: acceso por módulo" on cotizacion_items;
create policy "gestion: acceso por módulo" on cotizacion_items
  for all using (has_module('gestion')) with check (has_module('gestion'));

alter table cotizaciones add column if not exists vigencia_dias int not null default 30;
alter table cotizaciones add column if not exists contacto text;
alter table cotizaciones add column if not exists correo_contacto text;
alter table cotizaciones add column if not exists telefono_contacto text;
alter table cotizaciones add column if not exists seguimiento_interno text;
alter table cotizaciones add column if not exists descripcion_cliente text;
alter table cotizaciones add column if not exists forma_pago text;
alter table cotizaciones add column if not exists condiciones_cliente text;

-- Migrar cotizaciones existentes a un ítem equivalente (preserva el valor ya
-- cotizado exactamente: si la cotización responde IVA, se retira el IVA del
-- valor guardado antes de fijarlo como precio cliente unitario, porque el
-- motor de ítems vuelve a sumarlo al calcular).
insert into cotizacion_items (cotizacion_id, tipo, descripcion, unidad, cantidad, costo_unitario, precio_cliente_override)
select
  id,
  'insumo',
  'Costos de la cotización (migrado)',
  'unidad',
  1,
  coalesce(costos_estimados, 0),
  case
    when valor_cotizado > 0 and resp_iva then round((valor_cotizado / 1.19)::numeric, 2)
    when valor_cotizado > 0 then valor_cotizado
    else null
  end
from cotizaciones
where not exists (select 1 from cotizacion_items where cotizacion_items.cotizacion_id = cotizaciones.id);

notify pgrst, 'reload schema';

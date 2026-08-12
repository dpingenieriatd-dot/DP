-- =========================================================================
-- Migración 02b — versión definitiva, en archivo nuevo por si el anterior
-- se quedó en caché en el navegador o el editor de Supabase.
--
-- Ajusta el modelo de Gestión al motor financiero REAL encontrado en los
-- datos históricos del Anexo 2 (Panel_DP_Proyectos_Control_Presupuestal.html),
-- verificado al centavo contra 15 presupuestos reales de D&P.
--
-- Pegar completo en el SQL Editor de Supabase (borra lo que tengas escrito
-- ahí primero) y ejecutar. Es seguro volver a correrlo.
-- =========================================================================

-- Elimina directamente, por su id, la fila de prueba que ha bloqueado los
-- intentos anteriores (era solo un proyecto de prueba mío, "Proyecto de
-- prueba QA", ya archivado — no hay nada real que perder aquí).
delete from proyectos where id = '556bfdf3-4df8-4c34-8bae-3290781cc551';

-- ---------------------------------------------------------------------
-- 1. Clientes — agregar código, tipo y sector
-- ---------------------------------------------------------------------
alter table clientes add column if not exists codigo text;
alter table clientes add column if not exists tipo text;
alter table clientes add column if not exists sector text;

-- ---------------------------------------------------------------------
-- 2. Empresas atendidas — el Anexo las trata como la sede/compañía
-- específica donde se presta el servicio, bajo un Cliente "sombrilla"
-- (ej. Cliente = Compensar, Empresa atendida = Consorcio Salud).
-- ---------------------------------------------------------------------
alter table empresas_atendidas add column if not exists nit text;
alter table empresas_atendidas add column if not exists sector text;
alter table empresas_atendidas add column if not exists contacto text;
alter table empresas_atendidas add column if not exists correo text;
alter table empresas_atendidas add column if not exists telefono text;
alter table empresas_atendidas add column if not exists asesor text;

-- ---------------------------------------------------------------------
-- 3. Proveedores e Insumos
-- ---------------------------------------------------------------------
alter table proveedores add column if not exists codigo text;
alter table proveedores add column if not exists tipo text;

alter table insumos add column if not exists servicio text;

-- ---------------------------------------------------------------------
-- 4. Cotizaciones — pasa de "nombre + valor total" a una calculadora real:
-- personas × valor por persona (materiales) + horas × valor hora (profesional).
-- ---------------------------------------------------------------------
alter table cotizaciones add column if not exists empresa_id uuid references empresas_atendidas(id);
alter table cotizaciones add column if not exists responsable_id uuid references profiles(id);
alter table cotizaciones add column if not exists fecha date default current_date;
alter table cotizaciones add column if not exists personas numeric;
alter table cotizaciones add column if not exists valor_unit numeric default 0;
alter table cotizaciones add column if not exists val_materiales numeric default 0;
alter table cotizaciones add column if not exists horas numeric default 0;
alter table cotizaciones add column if not exists valor_hora numeric default 0;
alter table cotizaciones add column if not exists valor_prof numeric default 0;
alter table cotizaciones add column if not exists valor_sugerido numeric;
alter table cotizaciones add column if not exists margen numeric;

-- valor_total (nombre viejo) pasa a ser el "valor_cotizado" real.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'cotizaciones' and column_name = 'valor_total'
  ) then
    alter table cotizaciones rename column valor_total to valor_cotizado;
  end if;
end $$;

alter table cotizaciones drop constraint if exists cotizaciones_estado_check;
alter table cotizaciones add constraint cotizaciones_estado_check
  check (estado in ('Borrador', 'Enviada', 'Aprobada', 'Rechazada', 'Cancelada')) not valid;

-- ---------------------------------------------------------------------
-- 5. Proyectos — se simplifica: la parte financiera ahora vive en
-- Presupuestos (un proyecto puede tener varios presupuestos, se
-- encontraron casos reales con hasta 3 por proyecto).
-- ---------------------------------------------------------------------
alter table proyectos add column if not exists empresa_id uuid references empresas_atendidas(id);
alter table proyectos add column if not exists cotizacion_id uuid references cotizaciones(id);

alter table proyectos drop column if exists admin_pct;
alter table proyectos drop column if exists margen_pct;
alter table proyectos drop column if exists contrato_valor;
alter table proyectos drop column if exists iva_aplica;
alter table proyectos drop column if exists iva_pct;
alter table proyectos drop column if exists contrato_incluye_iva;
alter table proyectos drop column if exists retencion_pct;
alter table proyectos drop column if exists ica_pct;
alter table proyectos drop column if exists otras_retenciones;
alter table proyectos drop column if exists presupuesto_directo;

update proyectos set estado = 'Planeacion' where estado not in ('En ejecucion', 'Suspendido', 'Finalizado', 'Cancelado');

alter table proyectos drop constraint if exists proyectos_estado_check;
alter table proyectos add constraint proyectos_estado_check
  check (estado in ('Planeacion', 'En ejecucion', 'Suspendido', 'Finalizado', 'Cancelado')) not valid;
alter table proyectos alter column estado set default 'Planeacion';

-- presupuesto_items queda reemplazada por presupuesto_costos (línea por
-- línea, con presupuestado Y real por separado). No tenía datos reales
-- todavía, así que se elimina sin migración de datos.
drop table if exists presupuesto_items;

-- ---------------------------------------------------------------------
-- 6. Presupuestos — entidad propia (no un campo dentro de Proyectos).
-- Fórmulas verificadas contra los 19 presupuestos reales del Anexo 2:
--   admin              = costos * 0.15
--   utilidad_esperada  = costos * 30/70   (margen del 30% SOLO sobre costos)
--   valor              = costos + admin + utilidad_esperada
--   iva                = resp_iva ? valor * 0.19 : 0
--   valor_sugerido     = valor + iva
--   viabilidad         = valor_cotizado >= valor_sugerido ? Viable : No viable
-- ---------------------------------------------------------------------
create table if not exists presupuestos (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  cotizacion_id uuid references cotizaciones(id),
  codigo text,
  nombre text not null,
  empresa_id uuid references empresas_atendidas(id),
  costos numeric not null default 0,
  admin_pct numeric not null default 15,
  margen_pct numeric not null default 30,
  resp_iva boolean not null default true,
  iva_pct numeric not null default 19,
  valor_cotizado numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_presupuestos_updated_at on presupuestos;
create trigger trg_presupuestos_updated_at before update on presupuestos
  for each row execute function set_updated_at();

-- Costos línea por línea de cada presupuesto: lo PLANEADO y lo REAL se
-- registran por separado en cada fila (así se puede ver "vamos gastando
-- más de lo presupuestado en esta categoría" antes de que sea tarde).
create table if not exists presupuesto_costos (
  id uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references presupuestos(id) on delete cascade,
  categoria text not null default 'Otros costos' check (categoria in (
    'Compras / insumos', 'Servicios / profesionales', 'Materiales / desgaste',
    'Transporte / logistica', 'Viaticos', 'Otros costos', 'Costos directos'
  )),
  descripcion text,
  proveedor text,
  presupuestado numeric not null default 0,
  real numeric not null default 0,
  estado text not null default 'Planeado' check (estado in ('Planeado', 'Cotizado', 'Aprobado', 'Pagado')),
  origen text not null default 'Manual' check (origen in ('Manual', 'Compra', 'Presupuesto')),
  created_at timestamptz not null default now()
);

alter table presupuestos enable row level security;
alter table presupuesto_costos enable row level security;

drop policy if exists "gestion: acceso por modulo" on presupuestos;
create policy "gestion: acceso por modulo" on presupuestos
  for all using (has_module('gestion')) with check (has_module('gestion'));

drop policy if exists "gestion: acceso por modulo" on presupuesto_costos;
create policy "gestion: acceso por modulo" on presupuesto_costos
  for all using (has_module('gestion')) with check (has_module('gestion'));

-- ---------------------------------------------------------------------
-- 6b. Materiales — estados alineados con el Anexo 2.
-- ---------------------------------------------------------------------
update materiales set estado = 'Disponible' where estado = 'Activo';
update materiales set estado = 'Dado de baja' where estado = 'Inactivo';

alter table materiales drop constraint if exists materiales_estado_check;
alter table materiales add constraint materiales_estado_check
  check (estado in ('Disponible', 'En uso', 'En mantenimiento', 'Dado de baja')) not valid;
alter table materiales alter column estado set default 'Disponible';

-- ---------------------------------------------------------------------
-- 7. Compras — estados alineados con el Anexo 2 (antes eran
-- Pendiente/Parcial/Pagado; el Anexo usa un flujo de aprobación).
-- ---------------------------------------------------------------------
update compras set estado_pago = 'Cotizado' where estado_pago = 'Pendiente';
update compras set estado_pago = 'Aprobado' where estado_pago = 'Parcial';

alter table compras drop constraint if exists compras_estado_pago_check;
alter table compras add constraint compras_estado_pago_check
  check (estado_pago in ('Cotizado', 'Aprobado', 'Pagado', 'Rechazado')) not valid;
alter table compras alter column estado_pago set default 'Cotizado';

select 'MIGRACION 02b COMPLETADA' as resultado;

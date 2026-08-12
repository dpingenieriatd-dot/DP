-- =========================================================================
-- Migración 04 — Motor de rentabilidad ANTES de aceptar la cotización.
--
-- La orden de compra OC-1-1233 exige que el sistema muestre costos,
-- margen e IVA ANTES de aceptar el proyecto, no después. Hasta ahora
-- calcularPresupuesto() solo corría en el módulo Presupuestos, que se
-- crea DESPUÉS de aprobar la cotización. Esto agrega los campos que le
-- faltaban a Cotizaciones para correr el mismo cálculo en el momento
-- correcto: al cotizar, no al aprobar.
--
-- Pegar completo en el SQL Editor de Supabase y ejecutar. Es seguro
-- volver a correrlo (usa IF NOT EXISTS en todo).
-- =========================================================================

alter table cotizaciones add column if not exists costos_estimados numeric;
alter table cotizaciones add column if not exists resp_iva boolean not null default true;

select 'MIGRACION 04 COMPLETADA' as resultado;

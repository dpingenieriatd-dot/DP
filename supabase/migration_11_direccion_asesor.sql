-- =========================================================================
-- Migración 11 — dirección y nombre del asesor en Clientes/Proveedores
--
-- Pedido explícito de Angélica en la ronda de ajustes UAT de Fase 1:
-- agregar una columna de dirección y el nombre del asesor de contacto,
-- además de teléfono/correo que ya existían.
-- =========================================================================

alter table clientes add column if not exists direccion text;
alter table clientes add column if not exists nombre_asesor text;

alter table proveedores add column if not exists direccion text;
alter table proveedores add column if not exists nombre_asesor text;

notify pgrst, 'reload schema';

-- =========================================================================
-- Migración 34 — El modal "Nuevo cliente" del HTML tiene un campo "Cargo"
-- (cargo del contacto), junto a "Contacto" — la tabla clientes nunca tuvo
-- esa columna. Empresas atendidas ya la tiene (mismo concepto).
-- =========================================================================

alter table clientes add column if not exists cargo text;

notify pgrst, 'reload schema';

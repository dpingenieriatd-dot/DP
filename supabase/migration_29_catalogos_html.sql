-- Ajustes Fase 2 (auditoría HTML): campos que existen en los catálogos de referencia
-- (Panel_DP_gestiondeproyectos.html) pero faltaban en Empresas atendidas e Inventario materiales.
-- (insumos.proveedor_id y insumos.actualizacion ya existían en el esquema, solo faltaba
-- exponerlos en la página — no requieren migración.)
alter table empresas_atendidas add column if not exists cargo text;
alter table materiales add column if not exists cantidad numeric not null default 1;
alter table materiales add column if not exists ubicacion text;

notify pgrst, 'reload schema';

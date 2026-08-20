-- Ajustes Fase 2 (Gestión): la página de Compras (compras2.png) muestra un código por
-- compra en la primera columna, igual que Cotizaciones/Proyectos/Presupuestos.
alter table compras add column if not exists codigo text;

notify pgrst, 'reload schema';

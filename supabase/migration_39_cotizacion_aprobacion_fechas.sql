-- Fase 3 (cronograma): al aprobar una cotización se capturan las fechas del
-- proyecto y queda registrada la aprobación del cliente.

-- Registro formal de la aprobación del cliente sobre la cotización.
alter table cotizaciones add column if not exists fecha_aprobacion date;
alter table cotizaciones add column if not exists medio_aprobacion text;

-- Días de aviso previo a la fecha de entrega para el semáforo de tiempo del
-- Control de proyectos (amarillo "por vencer"). Editable por la Directora.
alter table settings add column if not exists dias_aviso_entrega numeric not null default 15;

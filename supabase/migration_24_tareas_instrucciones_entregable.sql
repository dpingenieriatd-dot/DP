-- Ajustes doc "Ajustes modulo seguimiento.docx" punto 1: el detalle de la tarea debe
-- mostrar instrucciones y entregables requeridos como campos propios, no fusionados
-- dentro de la descripción general.
alter table tareas add column if not exists instrucciones text;
alter table tareas add column if not exists entregable_requerido text;

notify pgrst, 'reload schema';

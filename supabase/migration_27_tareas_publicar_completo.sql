-- Ajustes Fase 2 (auditoría HTML): el formulario "Publicar tarea" en el HTML de
-- referencia (Panel_DP_gestiondeproyectos.html) incluye Empresa atendida,
-- Responsable (asignar desde la creación), Fecha/Hora de inicio para Agenda,
-- Observaciones y Entregable/soporte final — ninguno de estos existía en el
-- formulario actual de Banco de tareas.
alter table tareas add column if not exists empresa_atendida_id uuid references empresas_atendidas(id);
alter table tareas add column if not exists notas_publicacion text;
alter table tareas add column if not exists fecha_inicio_agenda date;
alter table tareas add column if not exists hora_inicio_agenda time;
alter table tareas add column if not exists entregable_soporte_url text;

notify pgrst, 'reload schema';

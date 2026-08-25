-- Ajustes Fase 2 (auditoría HTML): "Registrar actividad manual" en el HTML de referencia
-- selecciona la actividad de un catálogo enlazado al mapa de procesos (mismo catálogo que ya
-- usa Banco de tareas) en vez de escribir Cargo/Actividad como texto libre.
alter table actividades add column if not exists catalogo_actividad_id uuid references catalogo_actividades(id) on delete set null;
alter table actividades add column if not exists proceso_codigo text references procesos(codigo);
alter table actividades add column if not exists empresa_atendida_id uuid references empresas_atendidas(id);

notify pgrst, 'reload schema';

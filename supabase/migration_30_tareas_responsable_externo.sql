-- Migration 30: responsable externo en tareas
-- El HTML de referencia permite asignar una tarea a un Profesional externo (catálogo
-- `profesionales`, sin cuenta en la app — no puede tomar/iniciar/pausar su propia tarea).
-- `tareas.responsable` sigue siendo solo para el equipo interno (profiles); se agrega esta
-- columna separada para los externos, y queda mutuamente excluyente con `responsable` en la
-- práctica (la app nunca llena ambas a la vez).
alter table tareas add column if not exists responsable_externo_id uuid references profesionales(id);

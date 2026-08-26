-- El HTML de referencia muestra la fecha en que cada actividad fue archivada
-- (columna "Archivada" en Finalizadas y archivadas). La tabla tareas solo tenía
-- el booleano archivado, sin fecha.
alter table tareas add column if not exists archivado_at timestamptz;

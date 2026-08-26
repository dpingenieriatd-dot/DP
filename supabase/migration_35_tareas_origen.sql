-- =========================================================================
-- Migración 35 — Actividades (Seguimiento): en el HTML "Actividades" no es
-- una tabla propia, es un historial derivado de las mismas tareas de Banco
-- de tareas (tomadas, terminadas, o registradas manualmente con origen
-- "Actividad manual" desde el mismo formulario de Publicar tarea). Se
-- agrega la columna que faltaba para distinguir el origen de cada tarea.
--
-- La tabla "actividades" (independiente, con datos reales ya cargados) NO
-- se toca ni se borra — queda sin usar por esta pantalla pero disponible.
-- =========================================================================

alter table tareas add column if not exists origen text not null default 'Banco de tareas'
  check (origen in ('Banco de tareas', 'Actividad manual'));

notify pgrst, 'reload schema';

-- El cliente pidió un botón "Rechazar" junto a "Aprobar" en Cotizaciones: al
-- rechazar, se crea un proyecto con estado "Rechazado" que queda visible en
-- la misma lista de Proyectos (igual que "Aprobar" crea uno "Planeado").
alter table proyectos drop constraint if exists proyectos_estado_check;
alter table proyectos add constraint proyectos_estado_check
  check (estado in ('Planeado', 'En ejecución', 'Suspendido', 'Finalizado', 'Cancelado', 'Rechazado'));

-- =========================================================================
-- Migración 23 — alinea Gestión con el HTML de referencia V25: estados,
-- admin_pct por cotización, campos de Empresas atendidas y Profesionales.
--
-- Nota sobre proyectos.estado: la restricción viva en producción hoy es
-- ('Planeacion','En ejecucion','Finalizado','Cancelado','Suspendido') —
-- distinta de lo documentado en schema.sql ('Planeado','En ejecucion',...),
-- confirmado consultando la base directo. Se normaliza a las etiquetas
-- exactas del HTML ('Planeado','En ejecución' con tilde) y se actualizan
-- las filas existentes antes de cambiar la restricción.
-- =========================================================================

-- --- proyectos.estado ------------------------------------------------
-- La restricción vieja debe quitarse ANTES de actualizar los datos: mientras
-- sigue activa, solo permite los valores viejos ('Planeacion', 'En ejecucion'),
-- así que un UPDATE que intente escribir 'Planeado'/'En ejecución' la viola
-- igual que cualquier otro row nuevo.
alter table proyectos drop constraint if exists proyectos_estado_check;

update proyectos set estado = 'Planeado' where estado = 'Planeacion';
update proyectos set estado = 'En ejecución' where estado = 'En ejecucion';

alter table proyectos add constraint proyectos_estado_check
  check (estado in ('Planeado', 'En ejecución', 'Suspendido', 'Finalizado', 'Cancelado'));

-- --- compras.estado_pago ----------------------------------------------
alter table compras drop constraint if exists compras_estado_pago_check;
alter table compras add constraint compras_estado_pago_check
  check (estado_pago in ('Cotizado', 'Aprobado', 'Pagado', 'Pendiente', 'Rechazado'));

-- --- cotizaciones.admin_pct (editable por cotización, igual que margen_pct) --
alter table cotizaciones add column if not exists admin_pct numeric not null default 15;

-- --- empresas_atendidas: dirección + datos del asesor -------------------
alter table empresas_atendidas add column if not exists direccion text;
alter table empresas_atendidas add column if not exists telefono_asesor text;
alter table empresas_atendidas add column if not exists correo_asesor text;

-- --- profesionales: contacto, afiliaciones, carpeta ----------------------
alter table profesionales add column if not exists correo text;
alter table profesionales add column if not exists telefono text;
alter table profesionales add column if not exists telefono_emergencia text;
alter table profesionales add column if not exists eps text;
alter table profesionales add column if not exists arl text;
alter table profesionales add column if not exists carpeta text;

notify pgrst, 'reload schema';

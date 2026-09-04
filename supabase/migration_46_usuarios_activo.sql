-- =========================================================================
-- Migración 46 — Desactivar usuarios (en vez de borrarlos)
--
-- Casi todas las tablas que referencian a un usuario (tareas, tiempo
-- registrado, cotizaciones, auditoría) NO tienen borrado en cascada a
-- propósito -- son historial que no debe desaparecer. Por eso "eliminar
-- usuario" en Administración > Usuarios no borra la cuenta: la desactiva
-- (se le revoca el acceso vía ban en Supabase Auth y queda marcada aquí),
-- conservando su nombre en todo el historial.
-- =========================================================================

alter table profiles add column if not exists activo boolean not null default true;

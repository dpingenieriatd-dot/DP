-- =========================================================================
-- Migración 09 — Auditoría mínima (proyectos, compras, parámetros financieros)
--
-- Registra usuario, fecha, acción y valores anterior/nuevo en cada cambio,
-- vía triggers a nivel de base de datos (captura TODO cambio, no solo los
-- que pasan por la app) — esto es lo que pide el criterio QAQC "Auditoría
-- mínima" (fila 12 de 02_Checklist_QAQC.xlsx).
-- =========================================================================

create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  registro_id text not null,
  usuario_id uuid references profiles(id),
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  valores_anteriores jsonb,
  valores_nuevos jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_auditoria_tabla_fecha on auditoria (tabla, creado_en desc);

-- security definer, mismo patrón que is_admin()/has_module(): necesita
-- escribir en auditoria sin importar los permisos RLS de quien disparó el
-- cambio (cualquier usuario con acceso al módulo Gestión, no solo admin).
create or replace function fn_registrar_auditoria()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (tabla, registro_id, usuario_id, accion, valores_anteriores, valores_nuevos)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id)::text,
    auth.uid(),
    TG_OP,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_auditoria_proyectos on proyectos;
create trigger trg_auditoria_proyectos after insert or update or delete on proyectos
  for each row execute function fn_registrar_auditoria();

drop trigger if exists trg_auditoria_compras on compras;
create trigger trg_auditoria_compras after insert or update or delete on compras
  for each row execute function fn_registrar_auditoria();

drop trigger if exists trg_auditoria_settings on settings;
create trigger trg_auditoria_settings after insert or update or delete on settings
  for each row execute function fn_registrar_auditoria();

alter table auditoria enable row level security;

drop policy if exists "auditoria: solo admin lee" on auditoria;
create policy "auditoria: solo admin lee" on auditoria
  for select using (is_admin());

-- Sin políticas de insert/update/delete para usuarios normales a propósito:
-- solo el trigger (security definer) escribe en esta tabla.

-- Nota: las columnas de contrato usadas por el cálculo de efectivo neto
-- esperado (criterio QAQC fila 10) — contrato_valor, iva_aplica, iva_pct,
-- contrato_incluye_iva, retencion_pct, ica_pct, otras_retenciones — ya
-- existían en proyectos desde el esquema original; solo faltaba construir
-- el cálculo y exponer los campos en la UI (ver ProyectoDetalle).

-- =========================================================================
-- Migración 10 — Presencia ("en línea") del equipo, visible solo para admins
--
-- Cada persona con sesión activa manda un "latido" cada ~45s (ver
-- src/components/presence-heartbeat.tsx) que actualiza last_seen_at. La
-- página de Usuarios (admin) muestra "En línea" si fue hace menos de 2
-- minutos. La lectura de last_seen_at de OTRAS personas ya está cubierta
-- por la política existente de profiles (leer la propia o admin lee
-- todas) — no hace falta una política nueva.
-- =========================================================================

alter table profiles add column if not exists last_seen_at timestamptz;

-- Mismo patrón que actualizar_preferencias_recordatorio: profiles no tiene
-- (a propósito) una política que deje a cada quien editar su propia fila
-- completa, así que esta función permite tocar SOLO last_seen_at de la
-- propia fila, sin abrir la puerta a auto-asignarse role='admin'.
create or replace function actualizar_last_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  update profiles set last_seen_at = now() where id = auth.uid();
end;
$$;
grant execute on function actualizar_last_seen() to authenticated;

-- =========================================================================
-- Migración 49 — Auditoría: ampliar alcance y filtrar cambios vacíos
--
-- Antes: la auditoría solo registraba cambios en proyectos, compras y
-- settings. Todo lo demás de Gestión (cotizaciones, presupuestos, plan de
-- costos, clientes, empresas atendidas) no dejaba rastro -- por eso los
-- cambios de un usuario que trabaja sobre todo ahí no aparecían.
--
-- Cambios de esta migración:
--  1. Se auditan además: cotizaciones, presupuestos, presupuesto_costos,
--     clientes, empresas_atendidas.
--  2. Los UPDATE que no cambian nada (guardados sin modificación real, muy
--     comunes por el autoguardado onBlur) ya no generan fila de auditoría:
--     el trigger de UPDATE lleva WHEN (old is distinct from new).
-- =========================================================================

do $$
declare
  t text;
  tablas text[] := array[
    'proyectos', 'compras', 'settings',
    'cotizaciones', 'presupuestos', 'presupuesto_costos',
    'clientes', 'empresas_atendidas'
  ];
begin
  foreach t in array tablas loop
    -- Quita el trigger combinado anterior (solo existía en las 3 primeras).
    execute format('drop trigger if exists trg_auditoria_%s on %I', t, t);
    execute format('drop trigger if exists trg_auditoria_%s_iud on %I', t, t);
    execute format('drop trigger if exists trg_auditoria_%s_upd on %I', t, t);

    -- INSERT y DELETE: siempre se registran.
    execute format(
      'create trigger trg_auditoria_%s_iud after insert or delete on %I
         for each row execute function fn_registrar_auditoria()', t, t);

    -- UPDATE: solo si de verdad cambió algo.
    execute format(
      'create trigger trg_auditoria_%s_upd after update on %I
         for each row when (old is distinct from new)
         execute function fn_registrar_auditoria()', t, t);
  end loop;
end $$;

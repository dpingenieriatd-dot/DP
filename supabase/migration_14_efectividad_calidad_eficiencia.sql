-- =========================================================================
-- Migración 14 — Fase 5 (revisada) de ajustes UAT: Efectividad pasa a
-- combinar cumplimiento + eficiencia de tiempo (real vs. estimado) +
-- calidad del entregable — SIN el componente de equilibrio de carga
-- (que leía agenda_bloques). Angélica fue explícita: Agenda no debe
-- inflar Efectividad; la carga semanal basada en Agenda sigue viviendo
-- solo en Capacidad del equipo, que no se toca.
-- =========================================================================

-- Calificación de calidad del entregable, solo sobre tareas Terminadas,
-- solo por admin (Directora de Proyectos). Nullable: null = sin calificar
-- todavía ("Efectividad provisional").
alter table tareas add column if not exists calidad_pct numeric
  check (calidad_pct is null or calidad_pct in (20, 40, 60, 80, 100));

-- Reutiliza la columna que antes alimentaba "equilibrio de carga" — mismo
-- peso por defecto (10), ahora para "eficiencia de tiempo".
alter table efectividad_parametros rename column peso_equilibrio_carga to peso_eficiencia_tiempo;

notify pgrst, 'reload schema';

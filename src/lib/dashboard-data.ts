import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos } from "@/lib/finance";

export async function getDashboardData() {
  const supabase = await createClient();

  const [{ data: tareas }, { data: proyectosActivos }, { data: proyectosTodos }, { data: presupuestos }, { data: costos }, { data: clientes }] = await Promise.all([
    supabase.from("tareas").select("estado"),
    supabase.from("proyectos").select("id").eq("archivado", false),
    supabase.from("proyectos").select("id, nombre"),
    supabase.from("presupuestos").select("*"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
    supabase.from("clientes").select("id"),
  ]);

  const disponibles = (tareas ?? []).filter((t) => t.estado === "Disponible").length;
  const enProceso = (tareas ?? []).filter((t) => t.estado === "En proceso").length;
  const terminadas = (tareas ?? []).filter((t) => t.estado === "Terminada").length;

  let ingresos = 0;
  let gananciaEstTotal = 0;
  let viables = 0;
  const ingresosPorProyecto = new Map<string, number>();
  for (const pre of presupuestos ?? []) {
    const f = calcularPresupuesto(pre);
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
    ingresos += f.valorCotizado;
    gananciaEstTotal += control.gananciaEst;
    if (f.viable) viables += 1;
    if (pre.proyecto_id) {
      ingresosPorProyecto.set(pre.proyecto_id, (ingresosPorProyecto.get(pre.proyecto_id) ?? 0) + f.valorCotizado);
    }
  }

  const nombrePorProyecto = new Map((proyectosTodos ?? []).map((p) => [p.id, p.nombre]));
  const topProyectos = [...ingresosPorProyecto.entries()]
    .map(([id, valor]) => ({ name: nombrePorProyecto.get(id) ?? "Sin nombre", value: valor }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    disponibles,
    enProceso,
    terminadas,
    proyectosActivos: (proyectosActivos ?? []).length,
    clientes: (clientes ?? []).length,
    ingresos,
    gananciaEstTotal,
    viables,
    totalPresupuestos: (presupuestos ?? []).length,
    topProyectos,
  };
}

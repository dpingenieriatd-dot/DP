import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, money } from "@/lib/finance";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: tareas }, { data: proyectos }, { data: presupuestos }, { data: costos }, { data: clientes }] = await Promise.all([
    supabase.from("tareas").select("estado"),
    supabase.from("proyectos").select("id").eq("archivado", false),
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
  for (const pre of presupuestos ?? []) {
    const f = calcularPresupuesto(pre);
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
    ingresos += f.valorCotizado;
    gananciaEstTotal += control.gananciaEst;
    if (f.viable) viables += 1;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Inicio</h1>
      <p className="mt-1 text-sm text-neutral-500">Resumen general de Seguimiento y Gestión.</p>

      <h2 className="mt-6 text-sm font-semibold uppercase text-neutral-500">Seguimiento</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <Kpi label="Tareas disponibles" valor={disponibles} />
        <Kpi label="En proceso" valor={enProceso} />
        <Kpi label="Terminadas" valor={terminadas} />
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase text-neutral-500">Gestión</h2>
      <div className="mt-2 grid grid-cols-4 gap-4">
        <Kpi label="Proyectos activos" valor={(proyectos ?? []).length} />
        <Kpi label="Clientes" valor={(clientes ?? []).length} />
        <Kpi label="Valor cotizado total" valor={money.format(ingresos)} />
        <Kpi label="Ganancia estimada total" valor={money.format(gananciaEstTotal)} />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {viables} de {(presupuestos ?? []).length} presupuestos son viables (valor cotizado ≥ valor sugerido).
      </p>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-emerald-900">{valor}</div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { calcularFinanzas, money } from "@/lib/finance";

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: tareas }, { data: proyectos }, { data: compras }, { data: settings }] = await Promise.all([
    supabase.from("tareas").select("estado"),
    supabase.from("proyectos").select("*").eq("archivado", false),
    supabase.from("compras").select("proyecto_id, cantidad, valor_unitario"),
    supabase.from("settings").select("admin_pct").eq("id", 1).single(),
  ]);

  const disponibles = (tareas ?? []).filter((t) => t.estado === "Disponible").length;
  const enProceso = (tareas ?? []).filter((t) => t.estado === "En proceso").length;
  const terminadas = (tareas ?? []).filter((t) => t.estado === "Terminada").length;

  const finanzasProyectos = (proyectos ?? []).map((p) => {
    const ejecutado = (compras ?? [])
      .filter((c) => c.proyecto_id === p.id)
      .reduce((a, c) => a + Number(c.cantidad) * Number(c.valor_unitario), 0);
    return calcularFinanzas(p, Number(settings?.admin_pct ?? 15), ejecutado);
  });
  const ingresos = finanzasProyectos.reduce((a, f) => a + f.baseValue, 0);
  const facturado = finanzasProyectos.reduce((a, f) => a + f.invoiceTotal, 0);
  const utilidadEstimada = finanzasProyectos.reduce((a, f) => a + f.utilidadEstimada, 0);

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
        <Kpi label="Ingresos antes de IVA" valor={money.format(ingresos)} />
        <Kpi label="Total facturado" valor={money.format(facturado)} />
        <Kpi label="Utilidad estimada" valor={money.format(utilidadEstimada)} />
      </div>
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

import { createClient } from "@/lib/supabase/server";
import { semanaActual, toISODate } from "@/lib/week";

export default async function Page() {
  const supabase = await createClient();
  const semana = semanaActual();
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[4]);

  const [{ data: profiles }, { data: tareas }, { data: bloques }, { data: params }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, cargo, capacidad_semanal_horas").order("full_name"),
    supabase.from("tareas").select("responsable, estado, fecha_limite, fecha_cierre"),
    supabase.from("agenda_bloques").select("usuario_id, horas").gte("dia", desde).lte("dia", hasta),
    supabase.from("efectividad_parametros").select("*").eq("id", 1).single(),
  ]);

  const pesoCumplimiento = Number(params?.peso_cumplimiento ?? 50);
  const pesoOportunidad = Number(params?.peso_oportunidad ?? 25);
  const pesoEquilibrio = Number(params?.peso_equilibrio_carga ?? 10);
  const sumaPesosDisponibles = pesoCumplimiento + pesoOportunidad + pesoEquilibrio;

  const filas = (profiles ?? []).map((p) => {
    const propias = (tareas ?? []).filter((t) => t.responsable === p.id);
    const terminadas = propias.filter((t) => t.estado === "Terminada");
    const cumplimiento = propias.length ? (terminadas.length / propias.length) * 100 : 0;

    const conFecha = terminadas.filter((t) => t.fecha_limite);
    const aTiempo = conFecha.filter((t) => t.fecha_cierre && t.fecha_cierre <= t.fecha_limite!);
    const oportunidad = conFecha.length ? (aTiempo.length / conFecha.length) * 100 : 0;

    const planificadas = (bloques ?? []).filter((b) => b.usuario_id === p.id).reduce((a, b) => a + Number(b.horas), 0);
    const uso = p.capacidad_semanal_horas > 0 ? (planificadas / p.capacidad_semanal_horas) * 100 : 0;
    const equilibrio = Math.max(0, 100 - Math.abs(82 - Math.min(100, uso)) * 1.8);

    const score = sumaPesosDisponibles
      ? (cumplimiento * pesoCumplimiento + oportunidad * pesoOportunidad + equilibrio * pesoEquilibrio) / sumaPesosDisponibles
      : 0;

    return { p, cumplimiento, oportunidad, equilibrio, score, totalTareas: propias.length };
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Efectividad</h1>
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Fórmula parcial: combina <strong>cumplimiento</strong> ({pesoCumplimiento}%), <strong>oportunidad</strong> (
        {pesoOportunidad}%) y <strong>equilibrio de carga</strong> ({pesoEquilibrio}%), ajustado a 100. El componente de{" "}
        <strong>calidad del entregable</strong> ({params?.peso_calidad ?? 15}% pactado) todavía no se calcula: falta
        definir con D&P cómo se va a calificar. Los pesos se editan en Configuración por un administrador. Esto no debe
        usarse para comparar personas entre sí ni para decisiones automáticas.
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {filas.map(({ p, cumplimiento, oportunidad, equilibrio, score, totalTareas }) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-neutral-800">{p.full_name || p.email}</div>
                <div className="text-xs text-neutral-500">{p.cargo || "—"}</div>
              </div>
              <div className="text-2xl font-bold text-emerald-900">{Math.round(score)}%</div>
            </div>
            <Barra label="Cumplimiento" valor={cumplimiento} />
            <Barra label="Oportunidad" valor={oportunidad} />
            <Barra label="Equilibrio de carga" valor={equilibrio} />
            <div className="mt-2 text-xs text-neutral-400">{totalTareas} tarea(s) asignadas en total</div>
          </div>
        ))}
        {filas.length === 0 && <p className="text-neutral-400">Todavía no hay personas con perfil creado.</p>}
      </div>
    </div>
  );
}

function Barra({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>{Math.round(valor)}%</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, valor)}%` }} />
      </div>
    </div>
  );
}

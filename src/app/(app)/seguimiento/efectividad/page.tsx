import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: tareas }, { data: params }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, cargo").order("full_name"),
    supabase.from("tareas").select("responsable, estado, fecha_limite, fecha_cierre, horas_estimadas, horas_reales, calidad_pct"),
    supabase.from("efectividad_parametros").select("*").eq("id", 1).single(),
  ]);

  const pesoCumplimiento = Number(params?.peso_cumplimiento ?? 50);
  const pesoOportunidad = Number(params?.peso_oportunidad ?? 25);
  const pesoEficiencia = Number(params?.peso_eficiencia_tiempo ?? 10);
  const pesoCalidad = Number(params?.peso_calidad ?? 15);
  const sumaPesosBase = pesoCumplimiento + pesoOportunidad + pesoEficiencia;

  const filas = (profiles ?? []).map((p) => {
    const propias = (tareas ?? []).filter((t) => t.responsable === p.id);
    const terminadas = propias.filter((t) => t.estado === "Terminada");
    const cumplimiento = propias.length ? (terminadas.length / propias.length) * 100 : 0;

    const conFecha = terminadas.filter((t) => t.fecha_limite);
    const aTiempo = conFecha.filter((t) => t.fecha_cierre && t.fecha_cierre <= t.fecha_limite!);
    const oportunidad = conFecha.length ? (aTiempo.length / conFecha.length) * 100 : 0;

    // Eficiencia de tiempo: horas estimadas vs. horas reales por tarea terminada, promediado.
    // Reemplaza el antiguo "equilibrio de carga" (que leía Agenda) — Efectividad ya no depende
    // de cuánto se planificó, solo de cuánto tardó realmente cada tarea.
    const conTiempo = terminadas.filter((t) => t.horas_estimadas && Number(t.horas_reales) > 0);
    const eficiencia = conTiempo.length
      ? conTiempo.reduce((sum, t) => sum + Math.min(100, (Number(t.horas_estimadas) / Number(t.horas_reales)) * 100), 0) / conTiempo.length
      : 0;

    // Calidad del entregable: promedio de las tareas terminadas que ya fueron calificadas por un
    // admin. Provisional (no cuenta en el score) hasta que exista al menos una calificación.
    const calificadas = terminadas.filter((t) => t.calidad_pct != null);
    const provisional = calificadas.length === 0;
    const calidad = calificadas.length ? calificadas.reduce((sum, t) => sum + Number(t.calidad_pct), 0) / calificadas.length : 0;

    const sumaPesos = provisional ? sumaPesosBase : sumaPesosBase + pesoCalidad;
    const numerador =
      cumplimiento * pesoCumplimiento + oportunidad * pesoOportunidad + eficiencia * pesoEficiencia + (provisional ? 0 : calidad * pesoCalidad);
    const score = sumaPesos ? numerador / sumaPesos : 0;

    return { p, cumplimiento, oportunidad, eficiencia, calidad, provisional, score, totalTareas: propias.length };
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Efectividad</h1>
      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Combina <strong>cumplimiento</strong> ({pesoCumplimiento}%), <strong>oportunidad</strong> ({pesoOportunidad}%),{" "}
        <strong>eficiencia de tiempo</strong> ({pesoEficiencia}% — horas reales vs. estimadas) y <strong>calidad del entregable</strong> (
        {pesoCalidad}% — calificada por un admin al revisar cada tarea terminada), ajustado a 100. Mientras una persona no
        tenga ninguna tarea calificada, su puntaje se muestra como <strong>provisional</strong> (sin el componente de
        calidad). Los pesos se editan en Configuración por un administrador. Esto no debe usarse para comparar personas
        entre sí ni para decisiones automáticas.
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filas.map(({ p, cumplimiento, oportunidad, eficiencia, calidad, provisional, score, totalTareas }) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-neutral-800">{p.full_name || p.email}</div>
                <div className="text-xs text-neutral-500">{p.cargo || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-900">{Math.round(score)}%</div>
                {provisional && <div className="text-[11px] font-semibold text-amber-600">Efectividad provisional</div>}
              </div>
            </div>
            <Barra label="Cumplimiento" valor={cumplimiento} />
            <Barra label="Oportunidad" valor={oportunidad} />
            <Barra label="Eficiencia de tiempo" valor={eficiencia} />
            <Barra label="Calidad del entregable" valor={calidad} atenuada={provisional} />
            <div className="mt-2 text-xs text-neutral-400">{totalTareas} tarea(s) asignadas en total</div>
          </div>
        ))}
        {filas.length === 0 && <p className="text-neutral-400">Todavía no hay personas con perfil creado.</p>}
      </div>
    </div>
  );
}

function Barra({ label, valor, atenuada }: { label: string; valor: number; atenuada?: boolean }) {
  return (
    <div className={`mt-2 ${atenuada ? "opacity-50" : ""}`}>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{label}</span>
        <span>{atenuada ? "—" : `${Math.round(valor)}%`}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, valor)}%` }} />
      </div>
    </div>
  );
}

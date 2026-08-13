import { createClient } from "@/lib/supabase/server";
import { semanaActual, toISODate } from "@/lib/week";

function lectura(usoPct: number): [string, string] {
  if (usoPct < 55) return ["Capacidad disponible", "bg-sky-100 text-sky-700"];
  if (usoPct <= 90) return ["Carga equilibrada", "bg-emerald-100 text-emerald-700"];
  if (usoPct <= 110) return ["Carga alta", "bg-amber-100 text-amber-700"];
  return ["Sobrecarga", "bg-red-100 text-red-700"];
}

export default async function Page() {
  const supabase = await createClient();
  const semana = semanaActual();
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[6]);

  const [{ data: profiles }, { data: bloques }, { data: tareas }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, cargo, capacidad_semanal_horas").order("full_name"),
    supabase.from("agenda_bloques").select("usuario_id, horas").gte("dia", desde).lte("dia", hasta),
    supabase.from("tareas").select("responsable, estado"),
  ]);

  const filas = (profiles ?? []).map((p) => {
    const planificadas = (bloques ?? [])
      .filter((b) => b.usuario_id === p.id)
      .reduce((a, b) => a + Number(b.horas), 0);
    const usoPct = p.capacidad_semanal_horas > 0 ? (planificadas / p.capacidad_semanal_horas) * 100 : 0;
    const propias = (tareas ?? []).filter((t) => t.responsable === p.id);
    const abiertas = propias.filter((t) => t.estado !== "Terminada").length;
    const [texto, clase] = lectura(usoPct);
    return { p, planificadas, usoPct, abiertas, texto, clase };
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Capacidad del equipo</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Semana del {desde} al {hasta}. Objetivo: identificar capacidad disponible, equilibrio o sobrecarga — no genera
        automáticamente ninguna decisión sobre una persona.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {filas.map(({ p, planificadas, usoPct, abiertas, texto, clase }) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="font-semibold text-neutral-800">{p.full_name || p.email}</div>
            <div className="text-xs text-neutral-500">{p.cargo || "—"}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full bg-emerald-600"
                style={{ width: `${Math.min(100, usoPct)}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {planificadas}h / {p.capacidad_semanal_horas}h planificadas ({Math.round(usoPct)}%)
            </div>
            <div className="mt-2 text-xs text-neutral-500">{abiertas} tarea(s) abiertas</div>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>
          </div>
        ))}
        {filas.length === 0 && <p className="text-neutral-400">Todavía no hay personas con perfil creado.</p>}
      </div>
    </div>
  );
}

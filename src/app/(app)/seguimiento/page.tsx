import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PieCard } from "@/components/charts";

function isOverdue(t: { estado: string; archivado: boolean; fecha_limite: string | null }, today: string) {
  return t.estado !== "Terminada" && !t.archivado && !!t.fecha_limite && t.fecha_limite < today;
}
function dueSoon(t: { estado: string; fecha_limite: string | null }, today: string, days: number) {
  if (t.estado === "Terminada" || !t.fecha_limite) return false;
  const diff = (new Date(t.fecha_limite).getTime() - new Date(today).getTime()) / 86_400_000;
  return diff >= 0 && diff <= days;
}

export default async function SeguimientoInicioPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: tareas }, { data: actividades }, { data: proyectos }, { data: profiles }] = await Promise.all([
    supabase.from("tareas").select("id, titulo, cliente, proyecto_id, responsable, estado, prioridad, fecha_limite, archivado"),
    supabase.from("actividades").select("estado"),
    supabase.from("proyectos").select("id, nombre"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const todas = tareas ?? [];
  const abiertas = todas.filter((t) => !t.archivado);
  const disponibles = abiertas.filter((t) => t.estado === "Disponible").length;
  const enProceso = abiertas.filter((t) => t.estado === "En proceso" || t.estado === "Pausada").length;
  const terminadas = abiertas.filter((t) => t.estado === "Terminada").length;

  const cumplidas = (actividades ?? []).filter((a) => a.estado === "Cumplido").length;
  const pendientesParciales = (actividades ?? []).filter((a) => a.estado === "Pendiente" || a.estado === "Parcial").length;
  const noCumplidas = (actividades ?? []).filter((a) => a.estado === "No cumplido").length;

  const nombreProyecto = (id: string | null) => proyectos?.find((p) => p.id === id)?.nombre ?? "—";
  const nombreResponsable = (id: string | null) => {
    const p = profiles?.find((p) => p.id === id);
    return p ? p.full_name || p.email : "Sin asignar";
  };

  const atencion = abiertas
    .filter((t) => t.estado !== "Terminada")
    .map((t) => ({
      ...t,
      _rank: isOverdue(t, today) ? 0 : dueSoon(t, today, 3) ? 1 : t.prioridad === "Alta" ? 2 : 3,
    }))
    .sort((a, b) => a._rank - b._rank || (a.fecha_limite ?? "9999").localeCompare(b.fecha_limite ?? "9999"))
    .slice(0, 8);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Inicio</h1>
      <p className="mt-1 text-sm text-neutral-500">Resumen de tareas, actividades y pendientes del equipo.</p>

      <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>Regla principal:</strong> la actividad se registra una sola vez. Los cambios en Banco de tareas o Actividades se reflejan en Agenda y Efectividad.
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Disponibles" valor={disponibles} />
        <Kpi label="En proceso" valor={enProceso} />
        <Kpi label="Terminadas" valor={terminadas} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PieCard
          title="Tareas por estado"
          data={[
            { name: "Disponibles", value: disponibles },
            { name: "En proceso", value: enProceso },
            { name: "Terminadas", value: terminadas },
          ]}
        />
        <PieCard
          title="Resultado de actividades"
          data={[
            { name: "Cumplidas", value: cumplidas },
            { name: "Pendientes/Parciales", value: pendientesParciales },
            { name: "No cumplidas", value: noCumplidas },
          ]}
        />
      </div>

      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-emerald-900">Qué requiere atención</div>
            <div className="text-xs text-neutral-500">Primero vencidas, luego próximas y prioridad alta.</div>
          </div>
          <Link href="/seguimiento/tareas" className="text-xs font-semibold text-emerald-700 hover:underline">
            Ir al Banco de tareas
          </Link>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase text-neutral-500">
                <th className="px-3 py-2">Tarea</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Responsable</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Vence</th>
              </tr>
            </thead>
            <tbody>
              {atencion.map((t) => (
                <tr key={t.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{t.titulo}</td>
                  <td className="px-3 py-2">{t.cliente || "—"}</td>
                  <td className="px-3 py-2">{nombreProyecto(t.proyecto_id)}</td>
                  <td className="px-3 py-2">{nombreResponsable(t.responsable)}</td>
                  <td className="px-3 py-2">{t.estado}</td>
                  <td className="px-3 py-2">{t.fecha_limite || "—"}</td>
                </tr>
              ))}
              {atencion.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-400">
                    No hay pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

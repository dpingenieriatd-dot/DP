import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { esActividad, resultadoActividad } from "@/lib/actividad-tarea";
import { PieCard } from "@/components/charts";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";

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

  const [{ data: tareas }, { data: proyectos }, { data: profiles }, userLabel, filtro] = await Promise.all([
    supabase
      .from("tareas")
      .select("id, titulo, cliente, proyecto_id, responsable, responsable_externo_id, estado, prioridad, fecha_limite, archivado, origen"),
    supabase.from("proyectos").select("id, nombre"),
    supabase.from("profiles").select("id, full_name, email"),
    getCurrentProfileLabel(),
    getResponsableFiltro(),
  ]);

  const todas = (tareas ?? []).filter((t) => !filtro || t.responsable === filtro);
  const abiertas = todas.filter((t) => !t.archivado);
  const disponibles = abiertas.filter((t) => t.estado === "Disponible").length;
  const enProceso = abiertas.filter((t) => t.estado === "En proceso" || t.estado === "Pausada").length;
  const terminadas = abiertas.filter((t) => t.estado === "Terminada").length;
  const pendientesAbiertos = disponibles + enProceso;
  const vencidas = abiertas.filter((t) => isOverdue(t, today)).length;
  const vencenEn3 = abiertas.filter((t) => dueSoon(t, today, 3)).length;

  // "Resultado de actividades": mismo historial derivado de tareas que usa la página Actividades
  // (tomadas, terminadas o registradas manualmente) — no una tabla aparte.
  const resultadosActividad = todas.filter(esActividad).map(resultadoActividad);
  const cumplidas = resultadosActividad.filter((r) => r === "Cumplida").length;
  const pendientesParciales = resultadosActividad.filter((r) => r === "Pendiente/Parcial").length;
  const noCumplidas = resultadosActividad.filter((r) => r === "No cumplida").length;

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
    <div>
      <Topbar
        title="Inicio"
        subtitle="Resumen con porcentajes, pendientes y carga"
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles ?? []} value={filtro} />}
      />

      <div className="p-8">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Regla principal:</strong> la actividad se registra una sola vez. Los cambios realizados en Banco de tareas o Actividades se reflejan en Agenda y Efectividad.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Pendientes abiertos" value={pendientesAbiertos} subtitle="Requieren acción" color="emerald" />
          <KpiCard label="Vencidas" value={vencidas} subtitle="Requieren decisión" color="red" />
          <KpiCard label="Vencen en 3 días" value={vencenEn3} subtitle="Próximos compromisos" color="amber" />
          <KpiCard
            label="Terminadas activas"
            value={terminadas}
            color="blue"
            action={
              <Link href="/seguimiento/historial" className="inline-block rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
                Ver historial
              </Link>
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PieCard
            title="Tareas por estado"
            subtitle="Los porcentajes se muestran directamente en el gráfico."
            centerLabel="tareas"
            data={[
              { name: "Disponibles", value: disponibles },
              { name: "En proceso", value: enProceso },
              { name: "Terminadas", value: terminadas },
            ]}
          />
          <PieCard
            title="Resultado de actividades"
            subtitle="Cumplidas, pendientes/parciales y no cumplidas."
            centerLabel="actividades"
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
    </div>
  );
}

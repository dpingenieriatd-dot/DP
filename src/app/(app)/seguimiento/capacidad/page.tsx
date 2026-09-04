import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { requiereAdmin } from "@/lib/auth";
import { semanaActual, toISODate } from "@/lib/week";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";

function lectura(horasPlanificadas: number, pct: number): [string, string] {
  if (horasPlanificadas === 0) return ["Sin horas planificadas", "bg-neutral-300"];
  if (pct > 100) return ["Sobrecarga", "bg-red-500"];
  if (pct >= 80) return ["Carga alta", "bg-amber-500"];
  if (pct >= 50) return ["Carga equilibrada", "bg-blue-500"];
  return ["Capacidad disponible", "bg-blue-500"];
}

export default async function Page() {
  const supabase = await createClient();
  const semana = semanaActual();
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[6]);

  const [{ data: profiles }, { data: bloques }, { data: tareas }, userLabel, filtro, isAdmin] = await Promise.all([
    // Solo activos: alguien desactivado (ver Administración > Usuarios) ya no
    // debe aparecer con carga/pendientes en el tablero de Equipo.
    supabase.from("profiles").select("id, full_name, email, cargo, capacidad_semanal_horas").eq("activo", true).order("full_name"),
    supabase.from("agenda_bloques").select("usuario_id, horas").gte("dia", desde).lte("dia", hasta),
    supabase.from("tareas").select("responsable, estado, archivado, fecha_limite"),
    getCurrentProfileLabel(),
    getResponsableFiltro(),
    requiereAdmin(),
  ]);

  const profilesFiltrados = filtro ? (profiles ?? []).filter((p) => p.id === filtro) : profiles ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const filas = profilesFiltrados.map((p) => {
    const planificadas = (bloques ?? [])
      .filter((b) => b.usuario_id === p.id)
      .reduce((a, b) => a + Number(b.horas), 0);
    const usoPct = p.capacidad_semanal_horas > 0 ? Math.round((planificadas / p.capacidad_semanal_horas) * 100) : 0;
    const propias = (tareas ?? []).filter((t) => t.responsable === p.id);
    const abiertas = propias.filter((t) => !t.archivado && t.estado !== "Terminada").length;
    const vencidas = propias.filter((t) => !t.archivado && t.estado !== "Terminada" && t.fecha_limite && t.fecha_limite < today).length;
    const enProceso = propias.filter((t) => !t.archivado && (t.estado === "En proceso" || t.estado === "Pausada")).length;
    const archivadas = propias.filter((t) => t.archivado).length;
    const [texto, barClase] = lectura(planificadas, usoPct);
    return { p, planificadas, usoPct, abiertas, vencidas, enProceso, archivadas, texto, barClase };
  });

  return (
    <div>
      <Topbar
        title="Equipo"
        subtitle="Carga semanal y pendientes por persona"
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles ?? []} value={filtro} />}
      />

      <div className="p-8">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Lectura de capacidad:</strong> se calcula con las horas estimadas de tareas abiertas programadas para la semana visible. Las archivadas permanecen en el histórico y no afectan la carga actual.
        </div>

        <div className="mt-4 overflow-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Abiertas</th>
                <th className="px-4 py-3">Vencidas</th>
                <th className="px-4 py-3">En proceso</th>
                <th className="px-4 py-3">Archivadas</th>
                <th className="px-4 py-3">Carga semanal</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ p, planificadas, usoPct, abiertas, vencidas, enProceso, archivadas, texto, barClase }) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-800">{p.full_name || p.email}</div>
                    <div className="text-xs text-neutral-500">{p.cargo || "—"}</div>
                  </td>
                  <td className="px-4 py-3">{abiertas}</td>
                  <td className={`px-4 py-3 ${vencidas > 0 ? "font-semibold text-red-600" : ""}`}>{vencidas}</td>
                  <td className="px-4 py-3">{enProceso}</td>
                  <td className="px-4 py-3">
                    <div>{archivadas}</div>
                    {isAdmin && (
                      <Link
                        href={`/seguimiento/historial?responsable=${p.id}`}
                        className="mt-1 inline-block rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                      >
                        Ver archivadas
                      </Link>
                    )}
                  </td>
                  <td className="min-w-[220px] px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                      <span className={`h-2 w-2 rounded-full ${barClase}`} />
                      {texto} · {planificadas.toFixed(1)}/{p.capacidad_semanal_horas.toFixed(1)}h · {Math.round(usoPct)}%
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full ${barClase}`} style={{ width: `${Math.min(100, usoPct)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                    Todavía no hay personas con perfil creado.
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";

const CATEGORIAS = ["Estratégico", "Misional", "Apoyo"];
const CATEGORIAS_PLURAL: Record<string, string> = {
  Transversal: "transversales",
  Estratégico: "estratégicos",
  Misional: "misionales",
  Apoyo: "de apoyo",
};

export default async function ProcesosPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: procesos }, { data: tareas }, { data: profiles }, userLabel, filtro] = await Promise.all([
    supabase.from("procesos").select("codigo, nombre, categoria").order("codigo"),
    supabase.from("tareas").select("proceso_codigo, estado, archivado, fecha_limite, responsable"),
    supabase.from("profiles").select("id, full_name, email"),
    getCurrentProfileLabel(),
    getResponsableFiltro(),
  ]);

  const tareasFiltradas = filtro ? (tareas ?? []).filter((t) => t.responsable === filtro) : tareas ?? [];

  const conteos = new Map<string, { abiertas: number; vencidas: number; archivadas: number; total: number }>();
  for (const t of tareasFiltradas) {
    if (!t.proceso_codigo) continue;
    const c = conteos.get(t.proceso_codigo) ?? { abiertas: 0, vencidas: 0, archivadas: 0, total: 0 };
    c.total += 1;
    if (t.archivado) c.archivadas += 1;
    else if (t.estado !== "Terminada") {
      c.abiertas += 1;
      if (t.fecha_limite && t.fecha_limite < today) c.vencidas += 1;
    }
    conteos.set(t.proceso_codigo, c);
  }

  return (
    <div>
      <Topbar
        title="Procesos"
        subtitle="Clasificación de las tareas según el mapa de procesos de D&P"
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles ?? []} value={filtro} />}
      />

      <div className="p-8">
      {CATEGORIAS.map((cat) => {
        const deLaCategoria = (procesos ?? []).filter((p) => p.categoria === cat);
        if (deLaCategoria.length === 0) return null;
        return (
          <div key={cat} className="mt-6">
            <h2 className="text-sm font-semibold uppercase text-neutral-500">Procesos {CATEGORIAS_PLURAL[cat]}</h2>
            <p className="mb-2 text-xs text-neutral-400">El total conserva también el histórico de actividades archivadas.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {deLaCategoria.map((p) => {
                const c = conteos.get(p.codigo) ?? { abiertas: 0, vencidas: 0, archivadas: 0, total: 0 };
                return (
                  <div key={p.codigo} className="rounded-lg border border-neutral-200 bg-white p-4">
                    <div className="font-semibold text-emerald-900">
                      {p.codigo} · {p.nombre}
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">{p.categoria}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">{c.abiertas} abiertas</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${c.vencidas > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {c.vencidas} vencidas
                      </span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">{c.archivadas} archivadas</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-600">{c.total} total histórico</span>
                    </div>
                    <Link
                      href={`/seguimiento/historial?proceso=${p.codigo}`}
                      className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      Ver archivadas del proceso
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {(procesos ?? []).length === 0 && (
        <p className="mt-8 text-center text-neutral-400">
          Todavía no se ha cargado el catálogo de procesos.
        </p>
      )}
      </div>
    </div>
  );
}

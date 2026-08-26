"use client";

import { useState, useTransition } from "react";
import { calificarCalidad } from "../tareas/actions";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";

type Tarea = {
  id: string;
  titulo: string;
  responsable: string | null;
  fecha_cierre: string | null;
  horas_reales: number;
  calidad_pct: number | null;
};
type Profile = { id: string; full_name: string | null; email: string | null };

const ESCALA = [
  { valor: 100, label: "5 = 100%", texto: "Cumple completamente, sin correcciones." },
  { valor: 80, label: "4 = 80%", texto: "Requiere ajustes menores." },
  { valor: 60, label: "3 = 60%", texto: "Requiere varias correcciones." },
  { valor: 40, label: "2 = 40%", texto: "Requiere correcciones importantes." },
  { valor: 20, label: "1 = 20%", texto: "Debe rehacerse." },
];

function qualityText(pct: number | null) {
  return ESCALA.find((e) => e.valor === pct)?.texto ?? "";
}

export function EfectividadList({
  tareas,
  profiles,
  isAdmin,
  userLabel,
  filtro,
}: {
  tareas: Tarea[];
  profiles: Profile[];
  isAdmin: boolean;
  userLabel: string | null;
  filtro: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nombreResponsable = (id: string | null) => {
    const p = profiles.find((p) => p.id === id);
    return p ? p.full_name || p.email || "—" : "Sin asignar";
  };

  const rated = tareas.filter((t) => t.calidad_pct != null).length;
  const pendientes = tareas.length - rated;
  const promedio = rated ? Math.round(tareas.filter((t) => t.calidad_pct != null).reduce((s, t) => s + Number(t.calidad_pct), 0) / rated) : null;

  return (
    <div>
      <Topbar
        title="Efectividad"
        subtitle="Calidad por tarea y resultado provisional/final"
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles} value={filtro} />}
      />

      <div className="p-8">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Calidad del entregable:</strong> es calificada únicamente por la Directora de Proyectos, después de terminar la tarea y antes de
          archivarla. La calificación se realiza por cada tarea.
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ESCALA.map((e) => (
            <div key={e.valor} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="text-sm font-bold text-emerald-900">{e.label}</div>
              <div className="mt-1 text-xs text-neutral-500">{e.texto}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <KpiCard label="Tareas terminadas" value={tareas.length} color="neutral" />
          <KpiCard label="Pendientes de calidad" value={pendientes} subtitle="Efectividad provisional" color="amber" />
          <KpiCard label="Calificadas" value={rated} subtitle="Efectividad final" color="blue" />
          <KpiCard label="Calidad promedio" value={promedio === null ? "—" : `${promedio}%`} subtitle="Solo tareas calificadas" color="emerald" />
        </div>

        <div className="mt-6 overflow-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Terminada</th>
                <th className="px-4 py-3">Tiempo consolidado</th>
                <th className="px-4 py-3">Calidad</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {tareas.map((t) => (
                <tr key={t.id} className="border-t border-neutral-100">
                  <td className="px-4 py-3">{t.titulo}</td>
                  <td className="px-4 py-3">{nombreResponsable(t.responsable)}</td>
                  <td className="px-4 py-3">{t.fecha_cierre || "—"}</td>
                  <td className="px-4 py-3">{Number(t.horas_reales).toFixed(2)}h</td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <select
                        defaultValue={t.calidad_pct ?? ""}
                        disabled={pending}
                        onChange={(e) => {
                          const calidad = Number(e.target.value);
                          if (!calidad) return;
                          startTransition(async () => {
                            const r = await calificarCalidad(t.id, calidad);
                            if (r?.error) setError(r.error);
                          });
                        }}
                        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                      >
                        <option value="">Pendiente</option>
                        {ESCALA.map((e) => (
                          <option key={e.valor} value={e.valor}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    ) : t.calidad_pct != null ? (
                      `${t.calidad_pct / 20}/5 · ${t.calidad_pct}%`
                    ) : (
                      "Pendiente"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.calidad_pct != null ? (
                      <>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Efectividad final · {t.calidad_pct}%
                        </span>
                        <div className="mt-0.5 text-xs text-neutral-400">{qualityText(t.calidad_pct)}</div>
                      </>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Efectividad provisional</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!isAdmin && (
                      <span className="text-xs text-neutral-400">Ver desde Finalizadas y archivadas</span>
                    )}
                  </td>
                </tr>
              ))}
              {tareas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                    No hay tareas terminadas.
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

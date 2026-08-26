"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { calificarCalidad, archivarTarea } from "../tareas/actions";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";

type Tarea = {
  id: string;
  titulo: string;
  cliente: string | null;
  clientes?: { nombre: string } | null;
  proyectos?: { nombre: string } | null;
  responsable: string | null;
  fecha_cierre: string | null;
  horas_reales: number;
  calidad_pct: number | null;
  entregable: string | null;
  archivado: boolean;
};
type Profile = { id: string; full_name: string | null; email: string | null };

const NIVELES = [
  { valor: 100, label: "5 = 100%" },
  { valor: 80, label: "4 = 80%" },
  { valor: 60, label: "3 = 60%" },
  { valor: 40, label: "2 = 40%" },
  { valor: 20, label: "1 = 20%" },
];

export function HistorialList({
  tareas,
  profiles,
  isAdmin,
  filtroProceso,
  filtroResponsable,
  userLabel,
}: {
  tareas: Tarea[];
  profiles: Profile[];
  isAdmin: boolean;
  currentUserId: string | null;
  filtroProceso: { codigo: string; nombre: string } | null;
  filtroResponsable: { nombre: string } | null;
  userLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const nombreResponsable = (id: string | null) => {
    const p = profiles.find((p) => p.id === id);
    return p ? p.full_name || p.email || "—" : "Sin asignar";
  };

  const enRango = tareas
    .filter((t) => !desde || (t.fecha_cierre && t.fecha_cierre >= desde))
    .filter((t) => !hasta || (t.fecha_cierre && t.fecha_cierre <= hasta));
  const hayFiltros = !!(desde || hasta);
  const pendientes = enRango.filter((t) => !t.archivado);
  const archivadas = enRango.filter((t) => t.archivado);

  return (
    <div>
      <Topbar title="Finalizadas y archivadas" subtitle="Revisión, calificación y archivo de actividades terminadas" userLabel={userLabel ?? undefined} />

      <div className="p-8">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Historial de cierre:</strong> aquí se revisan las actividades finalizadas y se conservan las archivadas. Solo la Directora de Proyectos puede archivar.
        </div>
        {filtroProceso && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <span>
              <strong>Vista filtrada:</strong> Archivadas del proceso {filtroProceso.codigo} · {filtroProceso.nombre}
            </span>
            <Link href="/seguimiento/historial" className="font-semibold hover:underline">
              Ver todo el historial
            </Link>
          </div>
        )}
        {filtroResponsable && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <span>
              <strong>Vista filtrada:</strong> {filtroResponsable.nombre}
            </span>
            <Link href="/seguimiento/historial" className="font-semibold hover:underline">
              Ver todo el historial
            </Link>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-600">
            Terminada desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-sm text-neutral-600">
            Terminada hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          {hayFiltros && (
            <button
              onClick={() => {
                setDesde("");
                setHasta("");
              }}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <KpiCard label="Pendientes de archivo" value={pendientes.length} color="blue" />
          <KpiCard label="Archivadas" value={archivadas.length} color="violet" />
          <KpiCard label="Total histórico" value={enRango.length} color="emerald" />
          <KpiCard label="Con calidad registrada" value={enRango.filter((t) => t.calidad_pct != null).length} color="emerald" />
        </div>

        <Tabla
        title="Terminadas pendientes de archivo"
        sub="La Directora puede registrar la calidad y archivar desde esta misma tabla."
        rows={pendientes}
        nombreResponsable={nombreResponsable}
        isAdmin={isAdmin}
        pending={pending}
        onCalificar={(id, c) => startTransition(async () => { const r = await calificarCalidad(id, c); if (r?.error) setError(r.error); })}
        onArchivar={(id) => startTransition(async () => { const r = await archivarTarea(id); if (r?.error) setError(r.error); })}
        emptyLabel="No hay actividades finalizadas pendientes de archivo."
        showArchivar
      />

        <div className="mt-6">
          <Tabla
            title="Archivadas"
            sub="Historial permanente de actividades revisadas y cerradas."
            rows={archivadas}
            nombreResponsable={nombreResponsable}
            isAdmin={isAdmin}
            pending={pending}
            emptyLabel="No hay actividades archivadas."
            showArchivar={false}
          />
        </div>
      </div>
    </div>
  );
}

function Tabla({
  title,
  sub,
  rows,
  nombreResponsable,
  isAdmin,
  pending,
  onCalificar,
  onArchivar,
  emptyLabel,
  showArchivar,
}: {
  title: string;
  sub: string;
  rows: Tarea[];
  nombreResponsable: (id: string | null) => string;
  isAdmin: boolean;
  pending: boolean;
  onCalificar?: (id: string, calidad: number) => void;
  onArchivar?: (id: string) => void;
  emptyLabel: string;
  showArchivar: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-1 font-semibold text-emerald-900">{title}</div>
      <div className="mb-3 text-xs text-neutral-500">{sub}</div>
      <div className="overflow-auto">
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="px-3 py-2">Actividad</th>
              <th className="px-3 py-2">Cliente / proyecto</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2">Terminada</th>
              <th className="px-3 py-2">Tiempo</th>
              <th className="px-3 py-2">Calidad</th>
              <th className="px-3 py-2">Entregable</th>
              {showArchivar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">{t.titulo}</td>
                <td className="px-3 py-2">
                  {t.clientes?.nombre || t.cliente || "—"}
                  {t.proyectos?.nombre && <div className="text-neutral-400">{t.proyectos.nombre}</div>}
                </td>
                <td className="px-3 py-2">{nombreResponsable(t.responsable)}</td>
                <td className="px-3 py-2">{t.fecha_cierre || "—"}</td>
                <td className="px-3 py-2">{t.horas_reales?.toFixed(2) ?? "0"}h</td>
                <td className="px-3 py-2">
                  {isAdmin && onCalificar ? (
                    <select
                      defaultValue={t.calidad_pct ?? ""}
                      disabled={pending}
                      onChange={(e) => e.target.value && onCalificar(t.id, Number(e.target.value))}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    >
                      <option value="">Calidad</option>
                      {NIVELES.map((n) => (
                        <option key={n.valor} value={n.valor}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (t.calidad_pct != null ? `${t.calidad_pct}%` : "Pendiente")
                  )}
                </td>
                <td className="px-3 py-2">{t.entregable || "—"}</td>
                {showArchivar && (
                  <td className="px-3 py-2 text-right">
                    {isAdmin && onArchivar && (
                      <button
                        onClick={() => onArchivar(t.id)}
                        disabled={pending || t.calidad_pct == null}
                        title={t.calidad_pct == null ? "Califica la calidad antes de archivar" : undefined}
                        className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        🗄 Archivar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showArchivar ? 8 : 7} className="px-3 py-8 text-center text-neutral-400">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

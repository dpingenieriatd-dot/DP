"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  DetailModal,
  isExternalTask,
  asignadoLabel,
  type Tarea,
  type Profile,
  type Profesional,
  type Empresa,
  type Proceso,
  type ActividadCatalogo,
  type AgendaBloque,
} from "../tareas/board";
import { calificarCalidad, archivarTarea } from "../tareas/actions";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";

const NIVELES = [
  { valor: 100, label: "5 · 100%" },
  { valor: 80, label: "4 · 80%" },
  { valor: 60, label: "3 · 60%" },
  { valor: 40, label: "2 · 40%" },
  { valor: 20, label: "1 · 20%" },
];

export function HistorialList({
  tareas,
  profiles,
  profesionales,
  empresas,
  procesos,
  actividadesCatalogo,
  agendaBloques,
  isAdmin,
  filtroProceso,
  filtroResponsable,
  filtroGlobal,
  userLabel,
}: {
  tareas: Tarea[];
  profiles: Profile[];
  profesionales: Profesional[];
  empresas: Empresa[];
  procesos: Proceso[];
  actividadesCatalogo: ActividadCatalogo[];
  agendaBloques: AgendaBloque[];
  isAdmin: boolean;
  filtroProceso: { codigo: string; nombre: string } | null;
  filtroResponsable: { nombre: string } | null;
  filtroGlobal: string;
  userLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Tarea | null>(null);

  const pendientes = tareas.filter((t) => !t.archivado);
  const archivadas = tareas
    .filter((t) => t.archivado)
    .sort((a, b) => (b.archivado_at ?? b.fecha_cierre ?? "").localeCompare(a.archivado_at ?? a.fecha_cierre ?? ""));
  const totalHistorico = pendientes.length + archivadas.length;
  const conCalidad = tareas.filter((t) => t.calidad_pct != null).length;

  return (
    <div>
      <Topbar
        title="Finalizadas y archivadas"
        subtitle="Revisión, calificación y archivo de actividades terminadas"
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles} value={filtroGlobal} />}
      />

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

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <KpiCard label="Finalizadas pendientes de archivo" value={pendientes.length} color="blue" />
          <KpiCard label="Archivadas" value={archivadas.length} color="violet" />
          <KpiCard label="Total histórico" value={totalHistorico} color="neutral" />
          <KpiCard label="Con calidad registrada" value={conCalidad} color="neutral" />
        </div>

        <Tabla
          title="Finalizadas pendientes de archivo"
          sub="La Directora puede registrar la calidad y archivar desde esta misma tabla."
          rows={pendientes}
          profiles={profiles}
          profesionales={profesionales}
          empresas={empresas}
          isAdmin={isAdmin}
          pending={pending}
          onCalificar={(id, c) =>
            startTransition(async () => {
              const r = await calificarCalidad(id, c);
              if (r?.error) setError(r.error);
            })
          }
          onArchivar={(id) =>
            startTransition(async () => {
              const r = await archivarTarea(id);
              if (r?.error) setError(r.error);
            })
          }
          onVerDetalle={setDetalle}
          emptyLabel="No hay actividades finalizadas pendientes de archivo."
          archivadaCol={false}
        />

        <div className="mt-6">
          <Tabla
            title="Archivadas"
            sub="Historial permanente de actividades revisadas y cerradas."
            rows={archivadas}
            profiles={profiles}
            profesionales={profesionales}
            empresas={empresas}
            isAdmin={isAdmin}
            pending={pending}
            onVerDetalle={setDetalle}
            emptyLabel="No hay actividades archivadas."
            archivadaCol
          />
        </div>
      </div>

      {detalle && (
        <DetailModal
          tarea={detalle}
          profiles={profiles}
          profesionales={profesionales}
          empresas={empresas}
          procesos={procesos}
          actividadesCatalogo={actividadesCatalogo}
          agendaBloque={agendaBloques.find((b) => b.tarea_id === detalle.id) ?? null}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}

function DeliverableCell({ tarea, isAdmin }: { tarea: Tarea; isAdmin: boolean }) {
  const value = (tarea.entregable_soporte_url || tarea.entregable || "").trim();
  if (!value) return <span className="text-neutral-400">Sin soporte</span>;
  const esUrl = /^https?:\/\/\S+$/i.test(value);
  if (esUrl) {
    if (isAdmin) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
          title="Abrir soporte final"
        >
          Abrir entregable ↗
        </a>
      );
    }
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Soporte registrado</span>;
  }
  return <span>{value}</span>;
}

function QualityCell({ tarea, pending, onCalificar }: { tarea: Tarea; pending: boolean; onCalificar: (id: string, calidad: number) => void }) {
  const [valor, setValor] = useState(tarea.calidad_pct != null ? String(tarea.calidad_pct) : "");
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={valor}
        disabled={pending}
        onChange={(e) => setValor(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
      >
        <option value="">Calidad</option>
        {NIVELES.map((n) => (
          <option key={n.valor} value={n.valor}>
            {n.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => valor && onCalificar(tarea.id, Number(valor))}
        disabled={pending || !valor}
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
      >
        Guardar calidad
      </button>
    </div>
  );
}

function Tabla({
  title,
  sub,
  rows,
  profiles,
  profesionales,
  empresas,
  isAdmin,
  pending,
  onCalificar,
  onArchivar,
  onVerDetalle,
  emptyLabel,
  archivadaCol,
}: {
  title: string;
  sub: string;
  rows: Tarea[];
  profiles: Profile[];
  profesionales: Profesional[];
  empresas: Empresa[];
  isAdmin: boolean;
  pending: boolean;
  onCalificar?: (id: string, calidad: number) => void;
  onArchivar?: (id: string) => void;
  onVerDetalle: (t: Tarea) => void;
  emptyLabel: string;
  archivadaCol: boolean;
}) {
  const colSpan = archivadaCol ? 10 : 9;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-1 font-semibold text-emerald-900">{title}</div>
      <div className="mb-3 text-xs text-neutral-500">{sub}</div>
      <div className="overflow-auto">
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="px-3 py-2">Actividad</th>
              <th className="px-3 py-2">Cliente / empresa</th>
              <th className="px-3 py-2">Proyecto</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2">Finalizada</th>
              <th className="px-3 py-2">Tiempo</th>
              <th className="px-3 py-2">Calidad</th>
              <th className="px-3 py-2">Entregable</th>
              {archivadaCol && <th className="px-3 py-2">Archivada</th>}
              <th className="px-3 py-2">{archivadaCol ? "Acción" : "Acciones"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const externa = isExternalTask(t);
              const empresa = empresas.find((e) => e.id === t.empresa_atendida_id)?.nombre;
              return (
                <tr key={t.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">
                    {t.titulo}
                    <div className="text-neutral-400">{t.origen || "Banco de tareas"}</div>
                  </td>
                  <td className="px-3 py-2">
                    {t.clientes?.nombre || "—"}
                    {empresa && <div className="text-neutral-400">{empresa}</div>}
                  </td>
                  <td className="px-3 py-2">{t.proyectos?.nombre || "—"}</td>
                  <td className="px-3 py-2">
                    {asignadoLabel(t, profiles, profesionales) ?? "Sin asignar"}
                    {externa && <div className="text-neutral-400">Profesional externo</div>}
                  </td>
                  <td className="px-3 py-2">{t.fecha_cierre || "—"}</td>
                  <td className="px-3 py-2">{externa ? "No aplica" : `${t.horas_reales?.toFixed(2) ?? "0"}h`}</td>
                  <td className="px-3 py-2">
                    {isAdmin && onCalificar ? (
                      <QualityCell tarea={t} pending={pending} onCalificar={onCalificar} />
                    ) : t.calidad_pct != null ? (
                      `${t.calidad_pct / 20}/5 · ${t.calidad_pct}%`
                    ) : (
                      "Pendiente"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <DeliverableCell tarea={t} isAdmin={isAdmin} />
                  </td>
                  {archivadaCol && (
                    <td className="px-3 py-2">{t.archivado_at ? new Date(t.archivado_at).toLocaleDateString("es-CO") : "—"}</td>
                  )}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onVerDetalle(t)} className="text-xs font-medium text-emerald-700 hover:underline">
                        Ver detalles
                      </button>
                      {!archivadaCol && isAdmin && onArchivar && (
                        <button
                          onClick={() => onArchivar(t.id)}
                          disabled={pending || t.calidad_pct == null}
                          title={t.calidad_pct == null ? "Califica la calidad antes de archivar" : undefined}
                          className="rounded-md bg-emerald-900 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          Archivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-3 py-8 text-center text-neutral-400">
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

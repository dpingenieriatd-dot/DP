"use client";

import { useState, useTransition } from "react";
import { CreateModal, DetailModal, type Tarea, type Profile, type Cliente, type Proyecto, type Empresa, type Proceso, type ActividadCatalogo, type Profesional, type AgendaBloque } from "../tareas/board";
import { crearTarea } from "../tareas/actions";
import { resultadoActividad, type ResultadoActividad } from "@/lib/actividad-tarea";
import { CargoFilter } from "./cargo-filter";

type ActividadTarea = Tarea & { _cargo: string; _fecha: string; origen: string };

const RESULTADO_CLASS: Record<ResultadoActividad, string> = {
  Cumplida: "bg-emerald-100 text-emerald-700",
  "Pendiente/Parcial": "bg-amber-100 text-amber-700",
  "No cumplida": "bg-red-100 text-red-700",
};

export function ActividadesList({
  items,
  clientes,
  proyectos,
  empresas,
  actividadesCatalogo,
  procesos,
  profiles,
  profesionales,
  agendaBloques,
  currentUserId,
  isAdmin,
}: {
  items: ActividadTarea[];
  clientes: Cliente[];
  proyectos: Proyecto[];
  empresas: Empresa[];
  actividadesCatalogo: ActividadCatalogo[];
  procesos: Proceso[];
  profiles: Profile[];
  profesionales: Profesional[];
  agendaBloques: AgendaBloque[];
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detalle, setDetalle] = useState<ActividadTarea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibles = items.filter(
    (t) =>
      !busqueda ||
      `${t.titulo} ${t.clientes?.nombre ?? ""} ${t.proyectos?.nombre ?? ""} ${t._cargo} ${t.notas_publicacion ?? ""}`
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  function submitCrear(fd: FormData) {
    startTransition(async () => {
      const r = await crearTarea(fd);
      if (r?.error) setError(r.error);
      else setCreateOpen(false);
    });
  }

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <CargoFilter busqueda={busqueda} onBusquedaChange={setBusqueda} />
        <button onClick={() => setCreateOpen(true)} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          + Nueva actividad
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1000px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Fecha</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cargo</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Actividad</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Origen</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Observaciones</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((t) => {
              const resultado = resultadoActividad(t);
              return (
                <tr key={t.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">{t._fecha || "—"}</td>
                  <td className="px-3 py-2">{t._cargo}</td>
                  <td className="px-3 py-2">{t.titulo}</td>
                  <td className="px-3 py-2">{t.clientes?.nombre ?? "—"}</td>
                  <td className="px-3 py-2">{t.proyectos?.nombre ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESULTADO_CLASS[resultado]}`}>{resultado}</span>
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{t.origen}</td>
                  <td className="px-3 py-2 text-neutral-500">{t.notas_publicacion || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setDetalle(t)} className="text-xs font-medium text-emerald-700 hover:underline">
                      Ver
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-neutral-400">
                  No hay actividades para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <CreateModal
          clientes={clientes}
          proyectos={proyectos}
          empresas={empresas}
          profiles={profiles}
          profesionales={profesionales}
          actividadesCatalogo={actividadesCatalogo}
          procesos={procesos}
          modoManual
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setCreateOpen(false)}
          onSubmit={submitCrear}
          pending={pending}
        />
      )}

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

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { crearProyecto, archivarProyecto } from "./actions";
import { money } from "@/lib/finance";

type Fila = {
  proy: { id: string; codigo: string | null; nombre: string; estado: string };
  cliente: string;
  empresa: string;
  responsable: string;
  numPresupuestos: number;
  gananciaTotal: number;
  viableTodos: boolean | null;
};

export function ProyectosList({
  filas,
  clientes,
  empresas,
  profiles,
}: {
  filas: Fila[];
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await crearProyecto(formData);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-900">Proyectos</h1>
        <button onClick={() => setOpen(true)} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          + Nuevo proyecto
        </button>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[1000px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Código</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Empresa atendida</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Responsable</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Presupuestos</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Ganancia estimada</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map(({ proy, cliente, empresa, responsable, numPresupuestos, gananciaTotal, viableTodos }) => (
              <tr key={proy.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/gestion/proyectos/${proy.id}`} className="font-medium text-emerald-700 hover:underline">
                    {proy.codigo || "(sin código)"}
                  </Link>
                </td>
                <td className="px-3 py-2">{proy.nombre}</td>
                <td className="px-3 py-2">{cliente}</td>
                <td className="px-3 py-2">{empresa}</td>
                <td className="px-3 py-2">{responsable}</td>
                <td className="px-3 py-2">
                  {numPresupuestos}{" "}
                  {viableTodos !== null && (
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${viableTodos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {viableTodos ? "✅" : "❌"}
                    </span>
                  )}
                </td>
                <td className={`px-3 py-2 text-right ${gananciaTotal < 0 ? "text-red-600" : ""}`}>{money.format(gananciaTotal)}</td>
                <td className="px-3 py-2">{proy.estado}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {confirmingId === proy.id ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="text-neutral-500">¿Archivar?</span>
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await archivarProyecto(proy.id);
                            setConfirmingId(null);
                          })
                        }
                        className="font-semibold text-red-600 hover:underline"
                      >
                        Sí
                      </button>
                      <button onClick={() => setConfirmingId(null)} className="text-neutral-500 hover:underline">
                        No
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmingId(proy.id)} className="text-xs text-red-600 hover:underline">
                      Archivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-neutral-400">
                  No hay proyectos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form action={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">Nuevo proyecto</h2>
            <p className="mb-4 text-xs text-neutral-500">Lo financiero se maneja en el módulo Presupuestos, ligado a este proyecto.</p>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Código</span>
                <input name="codigo" placeholder="PT-001" className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Nombre del proyecto</span>
                <input name="nombre" required className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Cliente</span>
                <select name="cliente_id" className="in">
                  <option value="">Seleccione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Empresa atendida</span>
                <select name="empresa_id" className="in">
                  <option value="">Seleccione…</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Responsable</span>
                <select name="responsable_id" className="in">
                  <option value="">Seleccione…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                Crear y continuar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

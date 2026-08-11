"use client";

import { useState, useTransition } from "react";
import { crearCotizacion, actualizarCotizacion, eliminarCotizacion, aprobarYCrearProyecto } from "./actions";
import { money } from "@/lib/finance";

type Cotizacion = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  nombre: string;
  valor_total: number;
  estado: string;
};

const ESTADO_CLASS: Record<string, string> = {
  Borrador: "bg-neutral-100 text-neutral-600",
  Aprobada: "bg-emerald-100 text-emerald-700",
  Rechazada: "bg-red-100 text-red-700",
};

export function CotizacionesList({ cotizaciones, clientes }: { cotizaciones: Cotizacion[]; clientes: { id: string; nombre: string }[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clienteNombre = (id: string | null) => clientes.find((c) => c.id === id)?.nombre ?? "—";

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = editing ? await actualizarCotizacion(editing.id, formData) : await crearCotizacion(formData);
      if (r?.error) setError(r.error);
      else {
        setOpen(false);
        setEditing(null);
      }
    });
  }

  function aprobar(c: Cotizacion) {
    if (!confirmVisual(c.id)) return;
    startTransition(async () => {
      await aprobarYCrearProyecto(c);
    });
  }

  // pequeña confirmación sin dialogo nativo: se pide doble click via estado local
  const [porAprobar, setPorAprobar] = useState<string | null>(null);
  function confirmVisual(id: string) {
    if (porAprobar !== id) {
      setPorAprobar(id);
      return false;
    }
    return true;
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-900">Cotizaciones</h1>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva cotización
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">{c.codigo || "—"}</td>
                <td className="px-3 py-2">{c.nombre}</td>
                <td className="px-3 py-2">{clienteNombre(c.cliente_id)}</td>
                <td className="px-3 py-2 text-right">{money.format(c.valor_total)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_CLASS[c.estado]}`}>{c.estado}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {c.estado === "Borrador" && (
                    <button onClick={() => aprobar(c)} disabled={pending} className="mr-3 text-xs font-semibold text-emerald-700 hover:underline">
                      {porAprobar === c.id ? "¿Confirmar? Aprobar y crear proyecto" : "Aprobar → crear proyecto"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                    className="mr-2 text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await eliminarCotizacion(c.id);
                      })
                    }
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {cotizaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-neutral-400">
                  No hay cotizaciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form action={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">{editing ? "Editar" : "Nueva"} cotización</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Código</span>
                <input name="codigo" placeholder="COT-001" defaultValue={editing?.codigo ?? ""} className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Nombre</span>
                <input name="nombre" required defaultValue={editing?.nombre ?? ""} className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Cliente</span>
                <select name="cliente_id" defaultValue={editing?.cliente_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Valor total</span>
                <input type="number" step="0.01" name="valor_total" defaultValue={editing?.valor_total ?? ""} className="in" />
              </label>
              {editing && (
                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600">Estado</span>
                  <select name="estado" defaultValue={editing.estado} className="in">
                    <option>Borrador</option>
                    <option>Aprobada</option>
                    <option>Rechazada</option>
                  </select>
                </label>
              )}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

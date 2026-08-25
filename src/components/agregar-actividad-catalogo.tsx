"use client";

import { useState, useTransition } from "react";
import { agregarActividadCatalogo } from "@/lib/catalogo-actividades";

type NuevaActividad = { id: string; codigo: string; subproceso: string; descripcion: string | null; responsable_sugerido: string | null };

/** "+ Agregar actividad faltante al catálogo": mini-formulario inline reutilizado en Banco de
 * tareas y Actividades — ambos publican/registran seleccionando una actividad del mismo
 * catálogo de procesos, y ambos necesitan poder sumar una que falte sin salir del modal. */
export function AgregarActividadCatalogo({
  procesos,
  onAdded,
}: {
  procesos: { codigo: string; nombre: string }[];
  onAdded: (nueva: NuevaActividad) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1 text-xs font-medium text-emerald-700 hover:underline">
        + Agregar actividad faltante al catálogo
      </button>
    );
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await agregarActividadCatalogo(formData);
      if (r?.error) setError(r.error);
      else if (r?.data) {
        onAdded(r.data);
        setOpen(false);
        setError(null);
      }
    });
  }

  return (
    <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="mb-2 text-xs text-neutral-500">La actividad nueva quedará guardada y disponible para futuras publicaciones.</p>
      <form action={submit} className="space-y-2">
        <select name="proceso_codigo" required defaultValue="" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Selecciona el proceso…</option>
          {procesos.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.codigo} · {p.nombre}
            </option>
          ))}
        </select>
        <input name="subproceso" required placeholder="Nombre de la actividad" className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:underline">
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? "Agregando…" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}

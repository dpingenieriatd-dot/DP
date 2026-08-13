"use client";

import { useState, useTransition } from "react";
import { crearBloque, eliminarBloque } from "./actions";

type Profile = { id: string; full_name: string | null; email: string | null; capacidad_semanal_horas: number };
type Bloque = {
  id: string;
  usuario_id: string;
  dia: string;
  hora_inicio: string;
  horas: number;
  tarea: string | null;
  cliente: string | null;
};

const NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
/** Sábado y domingo quedan disponibles solo para días extraordinarios — no se espera uso regular. */
const ES_FIN_DE_SEMANA = [false, false, false, false, false, true, true];

export function AgendaGrid({ profiles, bloques, dias }: { profiles: Profile[]; bloques: Bloque[]; dias: string[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await crearBloque(formData);
      if (r?.error) setError(r.error);
      else setOpen(false);
    });
  }

  function del(id: string) {
    startTransition(async () => {
      await eliminarBloque(id);
    });
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-900">Agendas</h1>
          <p className="text-sm text-neutral-500">
            Semana del {dias[0]} al {dias[6]}. Sábado y domingo quedan disponibles solo para días extraordinarios
            que salgan del horario habitual.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Agregar bloque
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <th className="border-b border-r border-neutral-200 px-3 py-2">Persona</th>
              {NOMBRES.map((n, i) => (
                <th
                  key={n}
                  className={`border-b border-r border-neutral-200 px-3 py-2 ${ES_FIN_DE_SEMANA[i] ? "bg-amber-50 text-amber-700" : ""}`}
                >
                  {n}
                  {ES_FIN_DE_SEMANA[i] && <span className="ml-1 font-normal normal-case text-amber-600">(extraordinario)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const horasPersona = bloques.filter((b) => b.usuario_id === p.id).reduce((a, b) => a + Number(b.horas), 0);
              return (
                <tr key={p.id} className="align-top">
                  <td className="border-b border-r border-neutral-200 bg-neutral-50 px-3 py-2 font-medium text-neutral-700">
                    {p.full_name || p.email}
                    <div className="text-xs font-normal text-neutral-400">
                      {horasPersona}h / {p.capacidad_semanal_horas}h
                    </div>
                  </td>
                  {dias.map((dia, i) => (
                    <td
                      key={dia}
                      className={`border-b border-r border-neutral-200 px-2 py-2 ${ES_FIN_DE_SEMANA[i] ? "bg-amber-50/40" : ""}`}
                    >
                      {bloques
                        .filter((b) => b.usuario_id === p.id && b.dia === dia)
                        .map((b) => (
                          <div key={b.id} className="mb-1 rounded-md bg-emerald-50 p-2 text-xs">
                            <div className="font-semibold text-emerald-900">
                              {b.hora_inicio.slice(0, 5)} · {b.horas}h
                            </div>
                            {b.tarea && <div>{b.tarea}</div>}
                            {b.cliente && <div className="text-neutral-500">{b.cliente}</div>}
                            <button onClick={() => del(b.id)} className="mt-1 text-red-600 hover:underline">
                              Quitar
                            </button>
                          </div>
                        ))}
                    </td>
                  ))}
                </tr>
              );
            })}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                  Todavía no hay personas con perfil creado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form
            action={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">Agregar bloque a la agenda</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Persona</span>
                <select name="usuario_id" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Día</span>
                <select name="dia" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                  {dias.map((d, i) => (
                    <option key={d} value={d}>
                      {NOMBRES[i]} ({d}){ES_FIN_DE_SEMANA[i] ? " — extraordinario" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600">Hora inicio</span>
                  <input type="time" name="hora_inicio" defaultValue="08:00" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600">Duración (horas)</span>
                  <input type="number" step="0.5" min="0.5" name="horas" defaultValue="2" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Tarea / actividad</span>
                <input name="tarea" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Cliente / proyecto</span>
                <input name="cliente" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                Agregar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

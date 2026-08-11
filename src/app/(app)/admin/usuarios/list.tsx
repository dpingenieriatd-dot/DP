"use client";

import { useState, useTransition } from "react";
import { actualizarPerfil } from "./actions";

type Perfil = {
  id: string;
  email: string | null;
  full_name: string | null;
  cargo: string | null;
  role: string;
  modules: string[];
  capacidad_semanal_horas: number;
};

const MODULOS = [
  { key: "seguimiento", label: "Seguimiento" },
  { key: "gestion", label: "Gestión" },
];

export function UsuariosList({ perfiles, currentUserId }: { perfiles: Perfil[]; currentUserId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar(id: string, formData: FormData) {
    startTransition(async () => {
      const r = await actualizarPerfil(id, formData);
      if (r?.error) setError(r.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Usuarios</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cada persona nueva debe crear su cuenta desde la pantalla de inicio de sesión (o el administrador la invita
        desde el panel de Supabase). Aquí se asigna su rol y a qué módulos tiene acceso.
      </p>

      <div className="mt-4 space-y-3">
        {perfiles.map((p) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            {editingId === p.id ? (
              <form action={(fd) => guardar(p.id, fd)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm text-neutral-500">{p.email}</div>
                  <label className="text-sm">
                    <span className="mb-1 block text-neutral-600">Nombre / cargo</span>
                    <input name="cargo" defaultValue={p.cargo ?? ""} placeholder="Cargo" className="in" />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-neutral-600">Rol</span>
                    <select name="role" defaultValue={p.role} className="in">
                      <option value="member">Miembro</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-neutral-600">Capacidad semanal (horas)</span>
                    <input type="number" name="capacidad_semanal_horas" defaultValue={p.capacidad_semanal_horas} className="in" />
                  </label>
                </div>
                <div>
                  <span className="mb-1 block text-sm text-neutral-600">Módulos</span>
                  <div className="flex gap-4">
                    {MODULOS.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="modules" value={m.key} defaultChecked={p.modules?.includes(m.key)} />
                        {m.label}
                      </label>
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                    Guardar
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-md px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-neutral-800">
                    {p.full_name || p.email} {p.id === currentUserId && <span className="text-xs text-neutral-400">(tú)</span>}
                  </div>
                  <div className="text-xs text-neutral-500">{p.cargo || "Sin cargo asignado"}</div>
                  <div className="mt-1 flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.role === "admin" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                      {p.role === "admin" ? "Administrador" : "Miembro"}
                    </span>
                    {p.modules?.length ? (
                      p.modules.map((m) => (
                        <span key={m} className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400">Sin módulos asignados</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setEditingId(p.id)} className="text-sm font-medium text-emerald-700 hover:underline">
                  Editar
                </button>
              </div>
            )}
          </div>
        ))}
        {perfiles.length === 0 && <p className="text-neutral-400">Todavía no hay usuarios registrados.</p>}
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { actualizarPerfil, invitarUsuario } from "./actions";

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

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<string | null>(null);
  const [invitePending, startInviteTransition] = useTransition();

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

  function invitar(formData: FormData) {
    startInviteTransition(async () => {
      const r = await invitarUsuario(formData);
      if (r?.error) {
        setInviteError(r.error);
        setInviteOk(null);
      } else {
        setInviteError(null);
        setInviteOk(`Invitación enviada a ${formData.get("email")}.`);
      }
    });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-900">Usuarios</h1>
        <button
          onClick={() => {
            setInviteOk(null);
            setInviteError(null);
            setInviteOpen(true);
          }}
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Invitar usuario
        </button>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Invitá a alguien nuevo con su correo — le llega un enlace para crear su contraseña, y ya queda con el rol y los
        módulos que le asignes acá. Aquí también se edita el rol y los módulos de quienes ya tienen cuenta.
      </p>
      {inviteOk && <p className="mt-2 text-sm text-emerald-700">{inviteOk}</p>}

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

      {inviteOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setInviteOpen(false)}>
          <form action={invitar} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">Invitar usuario</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Correo</span>
                <input type="email" name="email" required className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Nombre completo</span>
                <input name="full_name" className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Cargo</span>
                <input name="cargo" className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Rol</span>
                <select name="role" defaultValue="member" className="in">
                  <option value="member">Miembro</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <div>
                <span className="mb-1 block text-sm text-neutral-600">Módulos</span>
                <div className="flex gap-4">
                  {MODULOS.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="modules" value={m.key} />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {inviteError && <p className="mt-3 text-sm text-red-600">{inviteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button type="submit" disabled={invitePending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {invitePending ? "Enviando…" : "Enviar invitación"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

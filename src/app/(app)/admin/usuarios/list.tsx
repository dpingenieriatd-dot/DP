"use client";

import { useEffect, useState, useTransition } from "react";
import { actualizarPerfil, invitarUsuario, desactivarUsuario, reactivarUsuario } from "./actions";
import { createClient } from "@/lib/supabase/client";

type Perfil = {
  id: string;
  email: string | null;
  full_name: string | null;
  cargo: string | null;
  role: string;
  modules: string[];
  capacidad_semanal_horas: number;
  last_seen_at?: string | null;
  activo: boolean;
};

const MODULOS = [
  { key: "seguimiento", label: "Seguimiento" },
  { key: "gestion", label: "Gestión" },
];

const UMBRAL_EN_LINEA_MS = 2 * 60 * 1000;
const INTERVALO_POLL_MS = 30_000;

function estaEnLinea(iso: string | null | undefined) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < UMBRAL_EN_LINEA_MS;
}

function haceTiempo(iso: string | null | undefined) {
  if (!iso) return "Sin actividad registrada";
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return "Activo hace un momento";
  const min = Math.floor(seg / 60);
  if (min < 60) return `Visto hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Visto hace ${hr} h`;
  const dias = Math.floor(hr / 24);
  return `Visto hace ${dias} d`;
}

export function UsuariosList({ perfiles, currentUserId }: { perfiles: Perfil[]; currentUserId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [presencia, setPresencia] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(perfiles.map((p) => [p.id, p.last_seen_at ?? null])),
  );

  useEffect(() => {
    const supabase = createClient();
    async function refrescar() {
      const { data } = await supabase.from("profiles").select("id, last_seen_at");
      if (data) setPresencia(Object.fromEntries(data.map((p) => [p.id, p.last_seen_at])));
    }
    refrescar();
    const id = setInterval(refrescar, INTERVALO_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteOk, setInviteOk] = useState<string | null>(null);
  const [invitePending, startInviteTransition] = useTransition();
  const [porDesactivar, setPorDesactivar] = useState<Perfil | null>(null);
  const [desactivarError, setDesactivarError] = useState<string | null>(null);
  const [desactivarPending, startDesactivarTransition] = useTransition();

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

  function confirmarDesactivar() {
    const p = porDesactivar;
    if (!p) return;
    setDesactivarError(null);
    startDesactivarTransition(async () => {
      const r = await desactivarUsuario(p.id);
      if (r?.error) setDesactivarError(r.error);
      else setPorDesactivar(null);
    });
  }

  function reactivar(id: string) {
    startDesactivarTransition(async () => {
      const r = await reactivarUsuario(id);
      if (r?.error) setError(r.error);
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
      {desactivarError && !porDesactivar && <p className="mt-2 text-sm text-red-600">{desactivarError}</p>}

      <div className="mt-4 space-y-3">
        {perfiles.map((p) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            {editingId === p.id ? (
              <form action={(fd) => guardar(p.id, fd)} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className={`flex items-center justify-between ${!p.activo ? "opacity-60" : ""}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      title={haceTiempo(presencia[p.id])}
                      className={`h-2 w-2 shrink-0 rounded-full ${estaEnLinea(presencia[p.id]) ? "bg-emerald-500" : "bg-neutral-300"}`}
                    />
                    <div className="font-medium text-neutral-800">
                      {p.full_name || p.email} {p.id === currentUserId && <span className="text-xs text-neutral-400">(tú)</span>}
                    </div>
                    {!p.activo && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-600">Inactivo</span>}
                  </div>
                  <div className="ml-4 text-xs text-neutral-500">{p.cargo || "Sin cargo asignado"}</div>
                  <div className="ml-4 text-[11px] text-neutral-400">
                    {estaEnLinea(presencia[p.id]) ? <span className="font-medium text-emerald-600">En línea</span> : haceTiempo(presencia[p.id])}
                  </div>
                  <div className="ml-4 mt-1 flex gap-2">
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
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingId(p.id)} className="text-sm font-medium text-emerald-700 hover:underline">
                    Editar
                  </button>
                  {p.id !== currentUserId &&
                    (p.activo ? (
                      <button
                        onClick={() => {
                          setDesactivarError(null);
                          setPorDesactivar(p);
                        }}
                        disabled={desactivarPending}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                      >
                        Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivar(p.id)}
                        disabled={desactivarPending}
                        className="text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60"
                      >
                        Reactivar
                      </button>
                    ))}
                </div>
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

      {porDesactivar && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => !desactivarPending && setPorDesactivar(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-red-700">Desactivar usuario</h2>
            <p className="mt-2 text-sm text-neutral-600">
              <strong>{porDesactivar.full_name || porDesactivar.email}</strong> ya no podrá iniciar sesión. Su nombre se conserva en tareas,
              cotizaciones y demás historial — se puede reactivar en cualquier momento desde esta misma lista.
            </p>
            {desactivarError && <p className="mt-3 text-sm text-red-600">{desactivarError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPorDesactivar(null)}
                disabled={desactivarPending}
                className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDesactivar}
                disabled={desactivarPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {desactivarPending ? "Desactivando…" : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

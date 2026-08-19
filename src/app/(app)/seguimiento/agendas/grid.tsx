"use client";

import { useState, useTransition } from "react";
import { crearBloque, eliminarBloque, actualizarPreferenciasRecordatorio } from "./actions";
import { iniciarTiempo, pausarTarea, reanudarTarea, terminarTarea } from "../tareas/actions";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";

type Profile = { id: string; full_name: string | null; email: string | null; capacidad_semanal_horas: number };
type Cliente = { id: string; nombre: string };
type Proyecto = { id: string; codigo: string | null; nombre: string };
type TimerActivo = { id: string; tarea_id: string; inicio: string } | null;
type Bloque = {
  id: string;
  usuario_id: string;
  dia: string;
  hora_inicio: string;
  horas: number;
  tarea: string | null;
  clientes?: { nombre: string } | null;
  proyectos?: { nombre: string } | null;
  tarea_id?: string | null;
  tareas?: { id: string; estado: string; responsable: string | null } | null;
};

const ESTADO_CLASS: Record<string, string> = {
  "En proceso": "bg-emerald-100 text-emerald-700",
  Pausada: "bg-amber-100 text-amber-700",
  Terminada: "bg-neutral-200 text-neutral-600",
};

const NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
/** Sábado y domingo quedan disponibles solo para días extraordinarios — no se espera uso regular. */
const ES_FIN_DE_SEMANA = [false, false, false, false, false, true, true];

/** Primer nombre + primer apellido, para que la columna angosta de la agenda no se overlape con el email. */
function nombreCorto(fullName: string | null, email: string | null) {
  // Algunos perfiles quedaron con full_name = su propio correo (valor por defecto al invitar, nunca completado).
  const nombreReal = fullName && fullName.trim() && !fullName.includes("@") ? fullName.trim() : null;
  if (nombreReal) {
    const partes = nombreReal.split(/\s+/);
    return partes.length === 1 ? partes[0] : `${partes[0]} ${partes[partes.length - 1]}`;
  }
  const correo = email || fullName;
  if (correo) {
    const partes = correo
      .split("@")[0]
      .split(/[._-]+/)
      .filter(Boolean);
    return partes.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ") || correo;
  }
  return "Sin nombre";
}

export function AgendaGrid({
  profiles,
  clientes,
  proyectos,
  bloques,
  dias,
  recordatorioMinutos,
  recordatorioSonido,
  currentUserId,
  timerActivo,
  userLabel,
}: {
  profiles: Profile[];
  clientes: Cliente[];
  proyectos: Proyecto[];
  bloques: Bloque[];
  dias: string[];
  recordatorioMinutos: number;
  recordatorioSonido: boolean;
  currentUserId: string | null;
  timerActivo: TimerActivo;
  userLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<{ tareaId: string; titulo: string } | null>(null);
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

  function run(fn: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  }

  const horasProgramadas = bloques.filter((b) => b.tareas?.estado !== "Terminada").reduce((s, b) => s + Number(b.horas), 0);
  const pausadas = bloques.filter((b) => b.tareas?.estado === "Pausada").length;
  const finalizadas = bloques.filter((b) => b.tareas?.estado === "Terminada").length;

  return (
    <div className="flex flex-col lg:h-full">
      <Topbar
        title="Agenda"
        subtitle="Programación automática y cronómetro sincronizado"
        userLabel={userLabel ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <RecordatorioSettings minutosInicial={recordatorioMinutos} sonidoInicial={recordatorioSonido} />
            <button
              onClick={() => setOpen(true)}
              className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              + Agregar bloque
            </button>
          </div>
        }
      />

      <div className="flex flex-col p-8 lg:min-h-0 lg:flex-1">
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Integración automática:</strong> al tomar una tarea del Banco o registrar una actividad manual, se solicita fecha y hora y el bloque aparece aquí. No crea un segundo registro.
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Horas programadas" value={`${horasProgramadas.toFixed(1)}h`} subtitle="Tareas abiertas de la semana" color="emerald" />
          <KpiCard label="Bloques visibles" value={bloques.length} subtitle="Incluye finalizados" color="blue" />
          <KpiCard label="Pausadas" value={pausadas} subtitle="Pueden reprogramarse" color="amber" />
          <KpiCard label="Finalizadas" value={finalizadas} subtitle="Con tiempo consolidado" color="neutral" />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="font-semibold text-emerald-900">Agenda del equipo</div>
            <p className="text-xs text-neutral-500">
              Semana del {dias[0]} al {dias[6]}. Sábado y domingo quedan disponibles solo para días extraordinarios que salgan del horario habitual.
            </p>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="min-h-[420px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[16%]" />
            {NOMBRES.map((n) => (
              <col key={n} className="w-[12%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="text-left uppercase tracking-wide text-neutral-500">
              <th className="sticky top-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-3">
                <div className="agenda-cell text-[clamp(0.65rem,6cqw,0.8rem)]">Persona</div>
              </th>
              {NOMBRES.map((n, i) => (
                <th
                  key={n}
                  className={`sticky top-0 z-10 border-b border-r border-neutral-200 px-3 py-3 ${ES_FIN_DE_SEMANA[i] ? "bg-amber-50 text-amber-700" : "bg-neutral-50"}`}
                >
                  <div className="agenda-cell text-[clamp(0.6rem,7cqw,0.75rem)]">
                    {n}
                    {ES_FIN_DE_SEMANA[i] && <span className="block font-normal normal-case text-amber-600">Extraordinario</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const horasPersona = bloques.filter((b) => b.usuario_id === p.id).reduce((a, b) => a + Number(b.horas), 0);
              return (
                <tr key={p.id} className="align-top">
                  <td className="border-b border-r border-neutral-200 bg-neutral-50 px-3 py-3 font-medium text-neutral-700">
                    <div className="agenda-cell">
                      <div className="text-[clamp(0.8rem,6cqw,0.95rem)]">{nombreCorto(p.full_name, p.email)}</div>
                      <div className="text-[clamp(0.65rem,5cqw,0.75rem)] font-normal text-neutral-400">
                        {horasPersona}h / {p.capacidad_semanal_horas}h
                      </div>
                    </div>
                  </td>
                  {dias.map((dia, i) => (
                    <td
                      key={dia}
                      className={`border-b border-r border-neutral-200 px-2 py-3 ${ES_FIN_DE_SEMANA[i] ? "bg-amber-50/40" : ""}`}
                    >
                      <div className="agenda-cell">
                        {bloques
                          .filter((b) => b.usuario_id === p.id && b.dia === dia)
                          .map((b) => {
                            const estado = b.tareas?.estado;
                            const esMia = b.tareas?.responsable === currentUserId;
                            const corriendo = timerActivo?.tarea_id === b.tarea_id;
                            return (
                              <div key={b.id} className="mb-2 break-words rounded-lg bg-emerald-50 p-3">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="text-[clamp(0.75rem,8cqw,0.95rem)] font-semibold text-emerald-900">
                                    {b.hora_inicio.slice(0, 5)} · {b.horas}h
                                  </div>
                                  {estado && (
                                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ESTADO_CLASS[estado] ?? ""}`}>
                                      {estado}
                                    </span>
                                  )}
                                </div>
                                {b.tarea && <div className="mt-0.5 text-[clamp(0.7rem,7cqw,0.875rem)]">{b.tarea}</div>}
                                <div className="mt-0.5 text-[clamp(0.6rem,6cqw,0.75rem)] text-neutral-400">{nombreCorto(p.full_name, p.email)}</div>
                                {b.clientes?.nombre && (
                                  <div className="mt-0.5 text-[clamp(0.65rem,6.5cqw,0.8rem)] text-neutral-500">{b.clientes.nombre}</div>
                                )}
                                {b.proyectos?.nombre && (
                                  <div className="text-[clamp(0.65rem,6.5cqw,0.8rem)] text-neutral-500">{b.proyectos.nombre}</div>
                                )}
                                {b.tarea_id ? (
                                  esMia && (estado === "En proceso" || estado === "Pausada") ? (
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {estado === "En proceso" ? (
                                        <>
                                          {corriendo ? (
                                            <button
                                              onClick={() => run(() => pausarTarea(timerActivo!.id))}
                                              disabled={pending}
                                              className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-amber-700 hover:underline"
                                            >
                                              ⏸ Pausar
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => run(() => iniciarTiempo(b.tarea_id!))}
                                              disabled={pending || !!timerActivo}
                                              className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-emerald-700 hover:underline disabled:opacity-60"
                                            >
                                              ▶ Tiempo
                                            </button>
                                          )}
                                          <button
                                            onClick={() => setFinishing({ tareaId: b.tarea_id!, titulo: b.tarea ?? "" })}
                                            className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-emerald-900 hover:underline"
                                          >
                                            ✓ Terminar
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => run(() => reanudarTarea(b.tarea_id!))}
                                          disabled={pending || !!timerActivo}
                                          className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-emerald-700 hover:underline disabled:opacity-60"
                                        >
                                          ▶ Reanudar
                                        </button>
                                      )}
                                    </div>
                                  ) : null
                                ) : (
                                  <button onClick={() => del(b.id)} className="mt-1 text-[clamp(0.65rem,6cqw,0.75rem)] text-red-600 hover:underline">
                                    Quitar
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
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
                      {nombreCorto(p.full_name, p.email)}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600">Cliente</span>
                  <select name="cliente_id" defaultValue="" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                    <option value="">Seleccione…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-neutral-600">Proyecto</span>
                  <select name="proyecto_id" defaultValue="" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                    <option value="">Seleccione…</option>
                    {proyectos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo ? `${p.codigo} · ` : ""}
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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

      {finishing && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setFinishing(null)}>
          <form
            action={(fd) =>
              startTransition(async () => {
                const r = await terminarTarea(finishing.tareaId, fd);
                if (r?.error) setError(r.error);
                else setFinishing(null);
              })
            }
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="mb-1 text-lg font-semibold text-emerald-900">Terminar tarea</h2>
            <p className="mb-4 text-sm text-neutral-500">{finishing.titulo}</p>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Entregable / enlace</span>
              <input name="entregable" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-neutral-600">Observaciones</span>
              <textarea name="notas" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setFinishing(null)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                Marcar terminada
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}

const OPCIONES_MINUTOS = [5, 10, 15, 30, 60];

function RecordatorioSettings({ minutosInicial, sonidoInicial }: { minutosInicial: number; sonidoInicial: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [minutos, setMinutos] = useState(minutosInicial);
  const [sonido, setSonido] = useState(sonidoInicial);
  const [guardando, startTransition] = useTransition();

  function guardar(nuevoMinutos: number, nuevoSonido: boolean) {
    setMinutos(nuevoMinutos);
    setSonido(nuevoSonido);
    startTransition(async () => {
      await actualizarPreferenciasRecordatorio(nuevoMinutos, nuevoSonido);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Preferencias de recordatorio"
        aria-label="Preferencias de recordatorio"
        className="rounded-md border border-neutral-300 p-2 text-neutral-600 hover:bg-neutral-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl">
            <div className="text-sm font-semibold text-emerald-900">Recordatorios de agenda</div>
            <p className="mt-1 text-xs text-neutral-500">Avisan con un aviso emergente y sonido antes de cada bloque tuyo.</p>

            <label className="mt-3 block text-xs font-medium text-neutral-600">
              Avisarme con anticipación de
              <select
                value={minutos}
                onChange={(e) => guardar(Number(e.target.value), sonido)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              >
                {OPCIONES_MINUTOS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-neutral-600">
              <input type="checkbox" checked={sonido} onChange={(e) => guardar(minutos, e.target.checked)} className="h-4 w-4 rounded" />
              Reproducir sonido
            </label>

            {guardando && <p className="mt-2 text-[11px] text-neutral-400">Guardando…</p>}
          </div>
        </>
      )}
    </div>
  );
}

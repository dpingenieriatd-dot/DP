"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { eliminarBloque, actualizarPreferenciasRecordatorio, reprogramarBloque } from "./actions";
import { iniciarTiempo, pausarTarea, reanudarTarea, terminarTarea } from "../tareas/actions";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";
import { useTiempoTotal } from "@/lib/use-elapsed";
import { formatDateDMY } from "@/lib/week";

const PASOS = [
  { titulo: "1. Se programa", texto: "Fecha y hora quedan vinculadas a la tarea." },
  { titulo: "2. Se inicia", texto: "El cronómetro solo corre cuando está En proceso." },
  { titulo: "3. Se pausa", texto: "Conserva el tiempo acumulado." },
  { titulo: "4. Se reprograma", texto: "Cambia fecha/hora sin duplicar la actividad." },
  { titulo: "5. Se finaliza", texto: "Se consolida el tiempo real invertido." },
];

type Profile = { id: string; full_name: string | null; email: string | null; capacidad_semanal_horas: number };
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
  tareas?: { id: string; estado: string; responsable: string | null; horas_reales: number } | null;
};

const ESTADO_CLASS: Record<string, string> = {
  "En proceso": "bg-emerald-100 text-emerald-700",
  Pausada: "bg-amber-100 text-amber-700",
  Terminada: "bg-neutral-200 text-neutral-600",
};

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
  bloques,
  dias,
  diasLabel,
  offsetSemana,
  recordatorioMinutos,
  recordatorioSonido,
  currentUserId,
  timerActivo,
  userLabel,
  todosLosProfiles,
  filtro,
  isAdmin,
  registrosAbiertos,
}: {
  profiles: Profile[];
  bloques: Bloque[];
  dias: string[];
  diasLabel: string[];
  offsetSemana: number;
  recordatorioMinutos: number;
  recordatorioSonido: boolean;
  currentUserId: string | null;
  timerActivo: TimerActivo;
  userLabel: string | null;
  todosLosProfiles: Profile[];
  filtro: string;
  isAdmin: boolean;
  registrosAbiertos: { id: string; tarea_id: string; inicio: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<{ tareaId: string; titulo: string } | null>(null);
  const [reprogramando, setReprogramando] = useState<{ tareaId: string; titulo: string; dia: string; hora: string } | null>(null);
  const [pending, startTransition] = useTransition();

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

  function registroAbiertoDe(tareaId: string | null | undefined) {
    if (!tareaId) return null;
    return registrosAbiertos.find((r) => r.tarea_id === tareaId) ?? null;
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
        filter={<ResponsableFiltro profiles={todosLosProfiles} value={filtro} />}
        actions={<RecordatorioSettings minutosInicial={recordatorioMinutos} sonidoInicial={recordatorioSonido} />}
      />

      <div className="flex flex-col p-8 lg:min-h-0 lg:flex-1">
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Integración automática:</strong> al tomar una tarea del Banco o registrar una actividad manual, se solicita fecha y hora y el bloque aparece aquí. No se crea un segundo registro.
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {PASOS.map((p) => (
            <div key={p.titulo} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="text-xs font-semibold text-emerald-900">{p.titulo}</div>
              <div className="mt-1 text-xs text-neutral-500">{p.texto}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Horas programadas" value={`${horasProgramadas.toFixed(1)}h`} subtitle="Tareas abiertas de la semana" color="neutral" />
          <KpiCard label="Bloques visibles" value={bloques.length} subtitle="Incluye finalizados" color="blue" />
          <KpiCard label="Pausadas" value={pausadas} subtitle="Pueden reprogramarse" color="amber" />
          <KpiCard label="Finalizadas" value={finalizadas} subtitle="Con tiempo consolidado" color="neutral" />
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-emerald-900">Agenda del equipo</div>
            <div className="text-xs text-neutral-500">
              {formatDateDMY(dias[0])} al {formatDateDMY(dias[6])}
            </div>
            <p className="text-xs text-neutral-500">Sábado y domingo quedan disponibles para actividades extraordinarias.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/seguimiento/agendas?semana=${offsetSemana - 1}`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              ← Semana anterior
            </Link>
            <Link
              href="/seguimiento/agendas"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Esta semana
            </Link>
            <Link
              href={`/seguimiento/agendas?semana=${offsetSemana + 1}`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Semana siguiente →
            </Link>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="min-h-[420px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[16%]" />
            {dias.map((dia) => (
              <col key={dia} className="w-[12%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="text-left uppercase tracking-wide text-neutral-500">
              <th className="sticky top-0 z-10 border-b border-r border-neutral-200 bg-neutral-50 px-3 py-3">
                <div className="agenda-cell text-[clamp(0.65rem,6cqw,0.8rem)]">Persona</div>
              </th>
              {dias.map((dia, i) => (
                <th
                  key={dia}
                  className={`sticky top-0 z-10 border-b border-r border-neutral-200 px-3 py-3 ${ES_FIN_DE_SEMANA[i] ? "bg-amber-50 text-amber-700" : "bg-neutral-50"}`}
                >
                  <div className="agenda-cell text-[clamp(0.6rem,7cqw,0.75rem)]">
                    {diasLabel[i]}
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
                            const puedeOperar = isAdmin || b.tareas?.responsable === currentUserId;
                            const registroAbierto = registroAbiertoDe(b.tarea_id);
                            const corriendo = !!registroAbierto;
                            const miTimerEnOtraTarea = !!timerActivo && timerActivo.tarea_id !== b.tarea_id;
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
                                {b.clientes?.nombre && (
                                  <div className="mt-0.5 text-[clamp(0.65rem,6.5cqw,0.8rem)] text-neutral-500">{b.clientes.nombre}</div>
                                )}
                                {b.proyectos?.nombre && (
                                  <div className="text-[clamp(0.65rem,6.5cqw,0.8rem)] text-neutral-500">{b.proyectos.nombre}</div>
                                )}
                                {b.tareas && (estado === "En proceso" || estado === "Pausada" || estado === "Terminada") && (
                                  <LiveTimer
                                    horasBase={Number(b.tareas.horas_reales)}
                                    inicioSesion={registroAbierto?.inicio ?? null}
                                    consolidado={estado === "Terminada"}
                                  />
                                )}
                                {b.tarea_id ? (
                                  puedeOperar && (estado === "En proceso" || estado === "Pausada") ? (
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {estado === "En proceso" ? (
                                        <>
                                          {corriendo ? (
                                            <button
                                              onClick={() => run(() => pausarTarea(registroAbierto!.id))}
                                              disabled={pending}
                                              className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-amber-700 hover:underline"
                                            >
                                              Pausar
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => run(() => iniciarTiempo(b.tarea_id!))}
                                              disabled={pending || miTimerEnOtraTarea}
                                              className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-emerald-700 hover:underline disabled:opacity-60"
                                            >
                                              Iniciar
                                            </button>
                                          )}
                                          <button
                                            onClick={() => setFinishing({ tareaId: b.tarea_id!, titulo: b.tarea ?? "" })}
                                            className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-emerald-900 hover:underline"
                                          >
                                            Finalizar
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => run(() => reanudarTarea(b.tarea_id!))}
                                            disabled={pending || !!timerActivo}
                                            className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-emerald-700 hover:underline disabled:opacity-60"
                                          >
                                            Continuar
                                          </button>
                                          <button
                                            onClick={() =>
                                              setReprogramando({ tareaId: b.tarea_id!, titulo: b.tarea ?? "", dia: b.dia, hora: b.hora_inicio.slice(0, 5) })
                                            }
                                            className="text-[clamp(0.65rem,6cqw,0.75rem)] font-semibold text-neutral-600 hover:underline"
                                          >
                                            Reprogramar
                                          </button>
                                        </>
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

      {reprogramando && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setReprogramando(null)}>
          <form
            action={(fd) =>
              startTransition(async () => {
                const r = await reprogramarBloque(reprogramando.tareaId, String(fd.get("dia")), String(fd.get("hora_inicio")));
                if (r?.error) setError(r.error);
                else setReprogramando(null);
              })
            }
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="mb-1 text-lg font-semibold text-emerald-900">Reprogramar tarea</h2>
            <p className="mb-4 text-sm text-neutral-500">{reprogramando.titulo}</p>
            <p className="mb-3 text-xs text-neutral-400">La nueva fecha y hora actualizan el mismo registro; no se crea una tarea duplicada.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Fecha de inicio *</span>
                <input type="date" name="dia" defaultValue={reprogramando.dia} required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Hora de inicio *</span>
                <input type="time" name="hora_inicio" defaultValue={reprogramando.hora} required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setReprogramando(null)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
}

function LiveTimer({
  horasBase,
  inicioSesion,
  consolidado,
}: {
  horasBase: number;
  inicioSesion: string | null;
  consolidado: boolean;
}) {
  const tiempo = useTiempoTotal(horasBase, inicioSesion);
  if (horasBase <= 0 && !inicioSesion) return null;
  return (
    <div className={`mt-1 text-[clamp(0.65rem,6.5cqw,0.8rem)] ${inicioSesion ? "font-mono font-semibold text-amber-700" : "text-neutral-500"}`}>
      ⏱ {tiempo} {inicioSesion ? "" : consolidado ? "consolidado" : "acumulado"}
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

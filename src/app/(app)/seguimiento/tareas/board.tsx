"use client";

import { useEffect, useState, useTransition } from "react";
import {
  crearTarea,
  tomarTarea,
  liberarTarea,
  terminarTarea,
  eliminarTarea,
  archivarTarea,
  pausarTarea,
  reanudarTarea,
  iniciarTiempo,
  detenerTiempo,
  calificarCalidad,
} from "./actions";
import { reprogramarBloque } from "../agendas/actions";

type Tarea = {
  id: string;
  titulo: string;
  cliente_id: string | null;
  proyecto_id: string | null;
  clientes?: { nombre: string } | null;
  proyectos?: { nombre: string } | null;
  prioridad: "Alta" | "Media" | "Baja";
  fecha_limite: string | null;
  descripcion: string | null;
  publicado_por: string | null;
  responsable: string | null;
  estado: "Disponible" | "En proceso" | "Pausada" | "Terminada";
  horas_estimadas: number | null;
  horas_reales: number;
  avance_pct: number;
  entregable: string | null;
  notas: string | null;
  archivado: boolean;
  calidad_pct: number | null;
};

type Profile = { id: string; full_name: string | null; email: string | null };
type Cliente = { id: string; nombre: string };
type Proyecto = { id: string; codigo: string | null; nombre: string };
type TimerActivo = { id: string; tarea_id: string; inicio: string } | null;

const PRIORIDAD_CLASS: Record<string, string> = {
  Alta: "bg-red-100 text-red-700",
  Media: "bg-amber-100 text-amber-700",
  Baja: "bg-emerald-100 text-emerald-700",
};

function nombreDe(profiles: Profile[], id: string | null) {
  if (!id) return null;
  const p = profiles.find((p) => p.id === id);
  return p?.full_name || p?.email || "—";
}

function useElapsed(inicio: string | null) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!inicio) return;
    const start = new Date(inicio).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inicio]);
  return elapsed;
}

export function TaskBoard({
  tareas,
  profiles,
  clientes,
  proyectos,
  currentUserId,
  timerActivo,
  isAdmin,
}: {
  tareas: Tarea[];
  profiles: Profile[];
  clientes: Cliente[];
  proyectos: Proyecto[];
  currentUserId: string | null;
  timerActivo: TimerActivo;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [finishing, setFinishing] = useState<Tarea | null>(null);
  const [tomando, setTomando] = useState<Tarea | null>(null);
  const [reprogramando, setReprogramando] = useState<Tarea | null>(null);
  const [detalle, setDetalle] = useState<Tarea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useElapsed(timerActivo?.inicio ?? null);
  const tareaTimer = timerActivo ? tareas.find((t) => t.id === timerActivo.tarea_id) : null;

  const disponibles = tareas.filter((t) => t.estado === "Disponible");
  const enProceso = tareas.filter((t) => t.estado === "En proceso");
  const pausadas = tareas.filter((t) => t.estado === "Pausada");
  const terminadas = tareas.filter((t) => t.estado === "Terminada" && !t.archivado);

  function run(fn: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="p-8">
      {tareaTimer && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>
            ⏱ Cronómetro activo — <strong>{tareaTimer.titulo}</strong>
          </span>
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold">{elapsed}</span>
            <button
              onClick={() => run(() => detenerTiempo(timerActivo!.id))}
              className="rounded-md bg-amber-800 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-900"
            >
              Detener
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-900">Banco de tareas</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Publicar tarea
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <HelpBanner />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase text-neutral-500">Disponibles</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{disponibles.length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase text-neutral-500">En proceso</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{enProceso.length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase text-neutral-500">Pausadas</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{pausadas.length}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs uppercase text-neutral-500">Terminadas</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{terminadas.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Column title="Disponibles" count={disponibles.length}>
          {disponibles.map((t) => (
            <Card key={t.id} t={t} profiles={profiles}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTomando(t)}
                  disabled={pending}
                  className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  🙋 Tomar
                </button>
                <button
                  onClick={() => setDetalle(t)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Ver detalles
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la tarea "${t.titulo}"?`)) run(() => eliminarTarea(t.id));
                    }}
                    disabled={pending}
                    className="rounded-md px-3 py-1.5 text-xs text-red-600 hover:underline disabled:opacity-60"
                  >
                    🗑 Eliminar
                  </button>
                )}
              </div>
            </Card>
          ))}
        </Column>

        <Column title="En proceso" count={enProceso.length}>
          {enProceso.map((t) => {
            const esMia = t.responsable === currentUserId;
            const corriendo = timerActivo?.tarea_id === t.id;
            return (
              <Card key={t.id} t={t} profiles={profiles}>
                <div className="flex flex-wrap gap-2">
                  {esMia && (
                    <>
                      {corriendo ? (
                        <button
                          onClick={() => run(() => pausarTarea(timerActivo!.id))}
                          disabled={pending}
                          className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                        >
                          ⏸ Pausar
                        </button>
                      ) : (
                        <button
                          onClick={() => run(() => iniciarTiempo(t.id))}
                          disabled={pending || !!timerActivo}
                          className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-60"
                        >
                          ▶ Tiempo
                        </button>
                      )}
                      <button
                        onClick={() => setFinishing(t)}
                        className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        ✓ Terminar
                      </button>
                      <button
                        onClick={() => run(() => liberarTarea(t.id))}
                        disabled={pending}
                        className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:underline"
                      >
                        Liberar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDetalle(t)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Ver detalles
                  </button>
                  {!esMia && <span className="text-xs text-neutral-400">Asignada, sin más acciones para ti</span>}
                </div>
              </Card>
            );
          })}
        </Column>

        <Column title="Pausadas" count={pausadas.length}>
          {pausadas.map((t) => {
            const esMia = t.responsable === currentUserId;
            return (
              <Card key={t.id} t={t} profiles={profiles}>
                <div className="flex flex-wrap gap-2">
                  {esMia && (
                    <>
                      <button
                        onClick={() => run(() => reanudarTarea(t.id))}
                        disabled={pending || !!timerActivo}
                        className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        ▶ Reanudar
                      </button>
                      <button
                        onClick={() => setReprogramando(t)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        📅 Reprogramar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDetalle(t)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Ver detalles
                  </button>
                </div>
              </Card>
            );
          })}
        </Column>

        <Column title="Terminadas" count={terminadas.length}>
          {terminadas.map((t) => (
            <Card key={t.id} t={t} profiles={profiles}>
              {isAdmin && <CalidadRating tarea={t} onRate={(c) => run(() => calificarCalidad(t.id, c))} disabled={pending} />}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDetalle(t)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Ver detalles
                </button>
                {isAdmin && (
                  <button
                    onClick={() => run(() => archivarTarea(t.id))}
                    disabled={pending}
                    className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:underline disabled:opacity-60"
                  >
                    🗄 Archivar
                  </button>
                )}
              </div>
            </Card>
          ))}
        </Column>
      </div>

      {detalle && <DetailModal tarea={detalle} profiles={profiles} onClose={() => setDetalle(null)} />}

      {tomando && (
        <TomarModal
          tarea={tomando}
          onClose={() => setTomando(null)}
          onSubmit={(fd) =>
            startTransition(async () => {
              const r = await tomarTarea(tomando.id, fd);
              if (r?.error) setError(r.error);
              else setTomando(null);
            })
          }
          pending={pending}
        />
      )}

      {reprogramando && (
        <TomarModal
          tarea={reprogramando}
          titulo="Reprogramar bloque de Agenda"
          textoBoton="Reprogramar"
          nota="El bloque conserva el mismo registro en Agenda, solo cambia la fecha y hora."
          onClose={() => setReprogramando(null)}
          onSubmit={(fd) =>
            startTransition(async () => {
              const r = await reprogramarBloque(reprogramando.id, String(fd.get("dia")), String(fd.get("hora_inicio")));
              if (r?.error) setError(r.error);
              else setReprogramando(null);
            })
          }
          pending={pending}
        />
      )}

      {createOpen && (
        <CreateModal
          clientes={clientes}
          proyectos={proyectos}
          onClose={() => setCreateOpen(false)}
          onSubmit={(fd) =>
            startTransition(async () => {
              const r = await crearTarea(fd);
              if (r?.error) setError(r.error);
              else setCreateOpen(false);
            })
          }
          pending={pending}
        />
      )}

      {finishing && (
        <FinishModal
          tarea={finishing}
          onClose={() => setFinishing(null)}
          onSubmit={(fd) =>
            startTransition(async () => {
              const r = await terminarTarea(finishing.id, fd);
              if (r?.error) setError(r.error);
              else setFinishing(null);
            })
          }
          pending={pending}
        />
      )}
    </div>
  );
}

const PASOS = [
  { titulo: "Revisa la tarea", detalle: "Abre la tarea para ver toda la información, instrucciones y observaciones." },
  { titulo: "Inicia el cronómetro", detalle: "Úsalo para medir el tiempo real mientras desarrollas la tarea." },
  { titulo: "Completa la tarea", detalle: "Desarrolla la actividad según las indicaciones." },
  { titulo: "Finaliza y entrega", detalle: "Marca la tarea como terminada y adjunta lo requerido." },
  { titulo: "Archiva o elimina", detalle: "Las tareas terminadas se archivan y las canceladas se eliminan." },
];

function HelpBanner() {
  return (
    <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <p className="mb-3 text-sm font-semibold text-emerald-900">¿Qué debes hacer en este módulo? Sigue estos 5 pasos:</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {PASOS.map((p, i) => (
          <div key={p.titulo} className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <div>
              <div className="text-xs font-semibold text-emerald-900">{p.titulo}</div>
              <div className="text-[11px] text-emerald-700">{p.detalle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-neutral-100 p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">{count}</span>
      </div>
      <div className="space-y-2">
        {count === 0 && <p className="px-1 text-xs text-neutral-400">Nada por aquí.</p>}
        {children}
      </div>
    </div>
  );
}

function Card({ t, profiles, children }: { t: Tarea; profiles: Profile[]; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
      <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORIDAD_CLASS[t.prioridad]}`}>
        {t.prioridad}
      </span>
      <h4 className="text-sm font-semibold text-neutral-800">{t.titulo}</h4>
      <div className="mt-1 space-y-0.5 text-xs text-neutral-500">
        {t.clientes?.nombre && <div>Cliente: {t.clientes.nombre}</div>}
        {t.proyectos?.nombre && <div>Proyecto: {t.proyectos.nombre}</div>}
        {t.fecha_limite && <div>Vence: {t.fecha_limite}</div>}
        {t.responsable && <div>Responsable: {nombreDe(profiles, t.responsable)}</div>}
        {(t.horas_estimadas || t.horas_reales > 0) && (
          <div>
            Horas: {Number(t.horas_reales).toFixed(1)}h{t.horas_estimadas ? ` / ${t.horas_estimadas}h est.` : ""}
          </div>
        )}
      </div>
      {t.descripcion && <p className="mt-2 text-xs text-neutral-600">{t.descripcion}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

const NIVELES_CALIDAD = [
  { valor: 20, label: "1 — debe rehacerse" },
  { valor: 40, label: "2 — correcciones importantes" },
  { valor: 60, label: "3 — varias correcciones" },
  { valor: 80, label: "4 — ajustes menores" },
  { valor: 100, label: "5 — cumple completamente" },
];

function CalidadRating({ tarea, onRate, disabled }: { tarea: Tarea; onRate: (calidad: number) => void; disabled: boolean }) {
  const estrella = tarea.calidad_pct ? tarea.calidad_pct / 20 : 0;
  return (
    <div className="mt-2 rounded-md bg-neutral-50 p-2">
      <div className="text-[11px] font-semibold text-neutral-500">Calidad del entregable</div>
      <div className="mt-1 flex items-center gap-1">
        {NIVELES_CALIDAD.map((n, i) => (
          <button
            key={n.valor}
            type="button"
            title={n.label}
            disabled={disabled}
            onClick={() => onRate(n.valor)}
            className={`text-lg leading-none disabled:opacity-60 ${i < estrella ? "text-amber-500" : "text-neutral-300 hover:text-amber-300"}`}
          >
            ★
          </button>
        ))}
        {tarea.calidad_pct != null && <span className="ml-1 text-[11px] text-neutral-400">({tarea.calidad_pct}%)</span>}
      </div>
    </div>
  );
}

function CreateModal({
  clientes,
  proyectos,
  onClose,
  onSubmit,
  pending,
}: {
  clientes: Cliente[];
  proyectos: Proyecto[];
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        action={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="mb-4 text-lg font-semibold text-emerald-900">Publicar tarea</h2>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Tarea por realizar</span>
            <textarea name="titulo" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
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
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Prioridad</span>
              <select name="prioridad" defaultValue="Media" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <option>Alta</option>
                <option>Media</option>
                <option>Baja</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Fecha límite</span>
              <input type="date" name="fecha_limite" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Horas estimadas</span>
              <input type="number" step="0.5" name="horas_estimadas" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Descripción / entregable esperado</span>
            <textarea name="descripcion" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            Publicar
          </button>
        </div>
      </form>
    </div>
  );
}

function TomarModal({
  tarea,
  titulo = "Tomar tarea",
  textoBoton = "Tomar tarea",
  nota = "Esto crea el bloque correspondiente en tu Agenda automáticamente — no hace falta agregarlo a mano.",
  onClose,
  onSubmit,
  pending,
}: {
  tarea: Tarea;
  titulo?: string;
  textoBoton?: string;
  nota?: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  const ahora = new Date();
  const hoy = ahora.toISOString().slice(0, 10);
  const horaActual = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        action={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="mb-1 text-lg font-semibold text-emerald-900">{titulo}</h2>
        <p className="mb-4 text-sm text-neutral-500">{tarea.titulo}</p>
        <p className="mb-3 text-xs text-neutral-500">{nota}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Día</span>
            <input type="date" name="dia" defaultValue={hoy} required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Hora de inicio</span>
            <input
              type="time"
              name="hora_inicio"
              defaultValue={horaActual}
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {textoBoton}
          </button>
        </div>
      </form>
    </div>
  );
}

function FinishModal({
  tarea,
  onClose,
  onSubmit,
  pending,
}: {
  tarea: Tarea;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        action={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="mb-1 text-lg font-semibold text-emerald-900">Terminar tarea</h2>
        <p className="mb-4 text-sm text-neutral-500">{tarea.titulo}</p>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Entregable / enlace</span>
          <input name="entregable" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-neutral-600">Observaciones</span>
          <textarea name="notas" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
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
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="border-t border-neutral-100 py-2 first:border-t-0">
      <div className="text-xs font-semibold uppercase text-neutral-400">{label}</div>
      <div className="mt-0.5 text-sm text-neutral-700">{value}</div>
    </div>
  );
}

function DetailModal({ tarea, profiles, onClose }: { tarea: Tarea; profiles: Profile[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORIDAD_CLASS[tarea.prioridad]}`}>
            {tarea.prioridad}
          </span>
          <span className="text-xs text-neutral-400">{tarea.estado}</span>
        </div>
        <h2 className="mb-3 text-lg font-semibold text-emerald-900">{tarea.titulo}</h2>
        <div>
          <DetailRow label="Descripción / entregable esperado" value={tarea.descripcion} />
          <DetailRow label="Cliente" value={tarea.clientes?.nombre} />
          <DetailRow label="Proyecto" value={tarea.proyectos?.nombre} />
          <DetailRow label="Fecha límite" value={tarea.fecha_limite} />
          <DetailRow label="Responsable" value={nombreDe(profiles, tarea.responsable)} />
          <DetailRow
            label="Horas"
            value={
              tarea.horas_estimadas || tarea.horas_reales > 0
                ? `${Number(tarea.horas_reales).toFixed(1)}h${tarea.horas_estimadas ? ` / ${tarea.horas_estimadas}h est.` : ""}`
                : null
            }
          />
          <DetailRow label="Entregable entregado" value={tarea.entregable} />
          <DetailRow label="Observaciones" value={tarea.notas} />
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
  calificarCalidad,
} from "./actions";
import { AgregarActividadCatalogo } from "@/components/agregar-actividad-catalogo";
import { reprogramarBloque } from "../agendas/actions";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";
import { useTiempoTotal } from "@/lib/use-elapsed";

type Tarea = {
  id: string;
  titulo: string;
  cliente_id: string | null;
  proyecto_id: string | null;
  empresa_atendida_id: string | null;
  clientes?: { nombre: string } | null;
  proyectos?: { nombre: string } | null;
  prioridad: "Alta" | "Media" | "Baja";
  fecha_limite: string | null;
  descripcion: string | null;
  instrucciones: string | null;
  entregable_requerido: string | null;
  entregable_soporte_url: string | null;
  notas_publicacion: string | null;
  publicado_por: string | null;
  responsable: string | null;
  responsable_externo_id: string | null;
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
type Empresa = { id: string; nombre: string; cliente_id: string | null };
type Proceso = { codigo: string; nombre: string };
type ActividadCatalogo = { id: string; codigo: string; subproceso: string; descripcion: string | null; responsable_sugerido: string | null };
type Profesional = { id: string; nombre: string; perfil: string | null; especialidad: string | null };
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

function nombreExterno(profesionales: Profesional[], id: string | null) {
  if (!id) return null;
  const p = profesionales.find((p) => p.id === id);
  return p ? `${p.nombre}${p.perfil ? ` · ${p.perfil}` : ""}` : "—";
}

function isExternalTask(t: Tarea) {
  return !!t.responsable_externo_id;
}

/** Etiqueta de responsable, sin importar si es equipo interno o profesional externo. */
function asignadoLabel(t: Tarea, profiles: Profile[], profesionales: Profesional[]) {
  if (t.responsable_externo_id) return nombreExterno(profesionales, t.responsable_externo_id);
  return nombreDe(profiles, t.responsable);
}

export function TaskBoard({
  tareas,
  profiles,
  clientes,
  proyectos,
  empresas,
  actividadesCatalogo,
  procesos,
  profesionales,
  filtro,
  currentUserId,
  timerActivo,
  registrosAbiertos,
  isAdmin,
  userLabel,
}: {
  tareas: Tarea[];
  profiles: Profile[];
  clientes: Cliente[];
  proyectos: Proyecto[];
  empresas: Empresa[];
  actividadesCatalogo: ActividadCatalogo[];
  procesos: Proceso[];
  profesionales: Profesional[];
  filtro: string;
  currentUserId: string | null;
  timerActivo: TimerActivo;
  registrosAbiertos: { id: string; tarea_id: string; inicio: string }[];
  isAdmin: boolean;
  userLabel: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [finishing, setFinishing] = useState<Tarea | null>(null);
  const [tomando, setTomando] = useState<Tarea | null>(null);
  const [reprogramando, setReprogramando] = useState<Tarea | null>(null);
  const [detalle, setDetalle] = useState<Tarea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const enRango = tareas
    .filter((t) => !desde || (t.fecha_limite && t.fecha_limite >= desde))
    .filter((t) => !hasta || (t.fecha_limite && t.fecha_limite <= hasta));
  const hayFiltros = !!(desde || hasta);
  const disponibles = enRango.filter((t) => t.estado === "Disponible");
  // El HTML de referencia no separa un carril de "Pausadas" — quedan dentro de "En proceso"
  // con otro set de botones (Continuar/Reprogramar en vez de Iniciar/Pausar/Terminar/Devolver).
  const enProceso = enRango.filter((t) => t.estado === "En proceso" || t.estado === "Pausada");
  const terminadas = enRango.filter((t) => t.estado === "Terminada" && !t.archivado);

  function run(fn: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
    });
  }

  function registroAbiertoDe(tareaId: string) {
    return registrosAbiertos.find((r) => r.tarea_id === tareaId) ?? null;
  }

  return (
    <div>
      <Topbar
        title="Banco de tareas"
        subtitle="Disponibles, en proceso y terminadas"
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles} value={filtro} />}
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            + Publicar tarea
          </button>
        }
      />

      <div className="p-8">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <HelpBanner />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-neutral-600">
            Vence desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-sm text-neutral-600">
            Vence hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          {hayFiltros && (
            <button
              onClick={() => {
                setDesde("");
                setHasta("");
              }}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Disponibles" value={disponibles.length} color="emerald" />
          <KpiCard label="En proceso" value={enProceso.length} color="amber" />
          <KpiCard
            label="Terminadas pendientes de archivo"
            value={terminadas.length}
            color="blue"
            action={
              <Link href="/seguimiento/historial" className="inline-block rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50">
                Ver finalizadas y archivadas
              </Link>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Column title="Disponibles" count={disponibles.length}>
          {disponibles.map((t) => (
            <Card key={t.id} t={t} profiles={profiles} profesionales={profesionales}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTomando(t)}
                  disabled={pending}
                  className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  Tomar
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
                    Eliminar
                  </button>
                )}
              </div>
            </Card>
          ))}
        </Column>

        <Column title="En proceso" count={enProceso.length}>
          {enProceso.map((t) => {
            const externa = isExternalTask(t);
            const pausada = t.estado === "Pausada";
            // Un admin/Directora puede operar cualquier tarea interna, no solo la propia —
            // igual que canOperate() en el HTML de referencia.
            const puedeOperar = !externa && (isAdmin || t.responsable === currentUserId);
            const registroAbierto = registroAbiertoDe(t.id);
            const corriendoAqui = !!registroAbierto;
            const miTimerEnOtraTarea = !!timerActivo && timerActivo.tarea_id !== t.id;
            return (
              <Card key={t.id} t={t} profiles={profiles} profesionales={profesionales} registroAbierto={registroAbierto}>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDetalle(t)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    Ver detalles
                  </button>
                  {externa && isAdmin && (
                    <button
                      onClick={() => setFinishing(t)}
                      className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Terminar
                    </button>
                  )}
                  {puedeOperar && pausada && (
                    <>
                      <button
                        onClick={() => run(() => reanudarTarea(t.id))}
                        disabled={pending || !!timerActivo}
                        className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                      >
                        Continuar
                      </button>
                      <button
                        onClick={() => setReprogramando(t)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        Reprogramar
                      </button>
                    </>
                  )}
                  {puedeOperar && !pausada && (
                    <>
                      {corriendoAqui ? (
                        <button
                          onClick={() => run(() => pausarTarea(registroAbierto!.id))}
                          disabled={pending}
                          className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-60"
                        >
                          Pausar
                        </button>
                      ) : (
                        <button
                          onClick={() => run(() => iniciarTiempo(t.id))}
                          disabled={pending || miTimerEnOtraTarea}
                          title={miTimerEnOtraTarea ? "Ya tienes un cronómetro corriendo en otra tarea" : undefined}
                          className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-60"
                        >
                          Iniciar
                        </button>
                      )}
                      <button
                        onClick={() => setFinishing(t)}
                        className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        Terminar
                      </button>
                      <button
                        onClick={() => run(() => liberarTarea(t.id))}
                        disabled={pending}
                        className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:underline"
                      >
                        Devolver a disponibles
                      </button>
                    </>
                  )}
                  {!puedeOperar && !externa && <span className="text-xs text-neutral-400">Asignada, sin más acciones para ti</span>}
                </div>
              </Card>
            );
          })}
        </Column>

        <Column title="Terminadas" count={terminadas.length}>
          {terminadas.map((t) => (
            <Card key={t.id} t={t} profiles={profiles} profesionales={profesionales}>
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
                    disabled={pending || t.calidad_pct == null}
                    title={t.calidad_pct == null ? "Califica la calidad del entregable antes de archivar" : undefined}
                    className="rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:underline disabled:opacity-60 disabled:no-underline"
                  >
                    Archivar
                  </button>
                )}
              </div>
            </Card>
          ))}
        </Column>
      </div>

      {detalle && (
        <DetailModal tarea={detalle} profiles={profiles} profesionales={profesionales} empresas={empresas} onClose={() => setDetalle(null)} />
      )}

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
          empresas={empresas}
          profiles={profiles}
          profesionales={profesionales}
          actividadesCatalogo={actividadesCatalogo}
          procesos={procesos}
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

function Card({
  t,
  profiles,
  profesionales,
  registroAbierto = null,
  children,
}: {
  t: Tarea;
  profiles: Profile[];
  profesionales: Profesional[];
  registroAbierto?: { inicio: string } | null;
  children?: React.ReactNode;
}) {
  const externa = isExternalTask(t);
  const enProcesoOPausada = t.estado === "En proceso" || t.estado === "Pausada";
  const tiempoReal = useTiempoTotal(Number(t.horas_reales) || 0, registroAbierto?.inicio ?? null);
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
        {externa ? (
          <div>
            👤 Profesional externo: {nombreExterno(profesionales, t.responsable_externo_id)}
            <div className="text-neutral-400">Seguimiento administrativo · sin cronómetro</div>
          </div>
        ) : (
          t.responsable && <div>Responsable: {nombreDe(profiles, t.responsable)}</div>
        )}
        {!externa && t.horas_estimadas && <div>Estimadas: {t.horas_estimadas}h</div>}
      </div>
      {!externa && enProcesoOPausada && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <span>⏱ {corriendo(registroAbierto) ? "Tiempo real" : "Tiempo consolidado"}</span>
          <span className="ml-auto font-mono font-semibold">{tiempoReal}</span>
        </div>
      )}
      {t.descripcion && <p className="mt-2 text-xs text-neutral-600">{t.descripcion}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function corriendo(registroAbierto: { inicio: string } | null | undefined) {
  return !!registroAbierto;
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
  empresas,
  profiles,
  profesionales,
  actividadesCatalogo,
  procesos,
  onClose,
  onSubmit,
  pending,
}: {
  clientes: Cliente[];
  proyectos: Proyecto[];
  empresas: Empresa[];
  profiles: Profile[];
  profesionales: Profesional[];
  actividadesCatalogo: ActividadCatalogo[];
  procesos: Proceso[];
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  const [catalogoLocal, setCatalogoLocal] = useState(actividadesCatalogo);
  // "" = sin elegir (placeholder) · "custom" = "Otra actividad temporal / no guardar en
  // catálogo" · cualquier otro valor = id real del catálogo. Igual que #f-task-catalog en el HTML.
  const [catalogoId, setCatalogoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [procesoCodigo, setProcesoCodigo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  // "INT|<id de profile>" o "EXT|<id de profesional>" — un solo select para equipo interno
  // y profesionales externos, igual que el HTML de referencia.
  const [responsableValue, setResponsableValue] = useState("");
  const [estado, setEstado] = useState("Disponible");
  const actividad = catalogoLocal.find((a) => a.id === catalogoId);

  function elegirActividad(id: string) {
    setCatalogoId(id);
    const a = catalogoLocal.find((x) => x.id === id);
    if (a) {
      setTitulo(`${a.codigo}_${a.subproceso}`);
      setProcesoCodigo(a.codigo);
      if (!descripcion.trim() && a.descripcion) setDescripcion(a.descripcion);
    } else {
      setTitulo("");
    }
  }

  const responsableInternoId = responsableValue.startsWith("INT|") ? responsableValue.slice(4) : "";
  const responsableExternoId = responsableValue.startsWith("EXT|") ? responsableValue.slice(4) : "";
  const empresasDelCliente = clienteId ? empresas.filter((e) => e.cliente_id === clienteId) : empresas;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        action={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="mb-3 text-lg font-semibold text-emerald-900">Publicar tarea</h2>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-800">Definición</div>
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <strong>Catálogos integrados:</strong> Cliente, Empresa atendida y Profesionales externos se toman de los catálogos de Gestión.
        </div>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Actividad del mapa de procesos *</span>
            <select
              name="catalogo_actividad_id"
              value={catalogoId}
              onChange={(e) => elegirActividad(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar actividad...</option>
              {catalogoLocal.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} · {a.subproceso}
                </option>
              ))}
              <option value="custom">Otra actividad temporal / no guardar en catálogo</option>
            </select>
            {catalogoId === "custom" && (
              <input
                name="titulo"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Escribe la actividad no catalogada"
                className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            )}
            {catalogoId !== "custom" && <input type="hidden" name="titulo" value={titulo} />}
            <span className="mt-1 block text-xs text-neutral-500">
              Selecciona una actividad de la lista. El proceso y la descripción se completan automáticamente.
            </span>
            {actividad && (
              <span className="mt-1 block text-xs text-neutral-500">
                {actividad.codigo} · {actividad.subproceso}
                {actividad.responsable_sugerido ? ` · Responsable sugerido: ${actividad.responsable_sugerido}` : ""}
              </span>
            )}
            <AgregarActividadCatalogo
              procesos={procesos}
              onAdded={(nueva) => {
                setCatalogoLocal((prev) => [...prev, nueva]);
                elegirActividad(nueva.id);
              }}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Cliente *</span>
              <select
                name="cliente_id"
                required
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  setEmpresaId("");
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
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
              <select
                name="empresa_atendida_id"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Cliente directo / Sin empresa atendida</option>
                {empresasDelCliente.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Proyecto *</span>
              <select name="proyecto_id" required defaultValue="" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
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
              <span className="mb-1 block text-neutral-600">Proceso *</span>
              <select
                name="proceso_codigo"
                required
                value={procesoCodigo}
                onChange={(e) => setProcesoCodigo(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccione…</option>
                {procesos.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} · {p.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Responsable</span>
            <input type="hidden" name="responsable_id" value={responsableInternoId} />
            <input type="hidden" name="responsable_externo_id" value={responsableExternoId} />
            <select
              value={responsableValue}
              onChange={(e) => setResponsableValue(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Sin asignar / Disponible</option>
              <optgroup label="Equipo interno">
                {profiles.map((p) => (
                  <option key={p.id} value={`INT|${p.id}`}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </optgroup>
              {profesionales.length > 0 && (
                <optgroup label="Profesionales externos · seguimiento administrativo">
                  {profesionales.map((p) => (
                    <option key={p.id} value={`EXT|${p.id}`}>
                      {p.nombre}
                      {p.perfil ? ` · ${p.perfil}` : ""}
                      {p.especialidad ? ` · ${p.especialidad}` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <span className="mt-1 block text-xs text-neutral-500">
              Los profesionales externos provienen del catálogo de Profesionales. No tienen acceso al Banco de tareas ni aparecen en Agenda.
            </span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Prioridad</span>
              <select name="prioridad" defaultValue="Media" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <option>Alta</option>
                <option>Media</option>
                <option>Baja</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Fecha límite *</span>
              <input type="date" name="fecha_limite" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Horas estimadas</span>
              <input type="number" step="0.5" min="0" name="horas_estimadas" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Fecha de inicio / Agenda</span>
              <input type="date" name="fecha_inicio_agenda" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Hora de inicio / Agenda</span>
              <input type="time" name="hora_inicio_agenda" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Descripción</span>
            <textarea
              name="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Instrucciones para el desarrollo</span>
            <textarea name="instrucciones" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Entregables requeridos</span>
            <textarea name="entregable_requerido" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Observaciones</span>
            <textarea name="notas_publicacion" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </label>

          <div className="mt-2 border-t border-neutral-200 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Control administrativo
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Estado</span>
            <select
              name="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option>Disponible</option>
              <option>En proceso</option>
              <option>Pausada</option>
              <option>Terminada</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Entregable / soporte final</span>
            <input
              type="text"
              name="entregable_soporte_url"
              placeholder="Enlace o referencia"
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
            Guardar
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

function DetailModal({
  tarea,
  profiles,
  profesionales,
  empresas,
  onClose,
}: {
  tarea: Tarea;
  profiles: Profile[];
  profesionales: Profesional[];
  empresas: Empresa[];
  onClose: () => void;
}) {
  const empresaNombre = empresas.find((e) => e.id === tarea.empresa_atendida_id)?.nombre;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-1 flex items-center gap-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORIDAD_CLASS[tarea.prioridad]}`}>
            {tarea.prioridad}
          </span>
          <span className="text-xs text-neutral-400">{tarea.estado}</span>
        </div>
        <h2 className="mb-3 text-lg font-semibold text-emerald-900">{tarea.titulo}</h2>
        <div>
          <DetailRow label="Descripción" value={tarea.descripcion} />
          <DetailRow label="Instrucciones" value={tarea.instrucciones} />
          <DetailRow label="Cliente" value={tarea.clientes?.nombre} />
          <DetailRow label="Empresa atendida" value={empresaNombre} />
          <DetailRow label="Proyecto" value={tarea.proyectos?.nombre} />
          <DetailRow label="Fecha límite" value={tarea.fecha_limite} />
          <DetailRow label="Responsable" value={asignadoLabel(tarea, profiles, profesionales)} />
          <DetailRow
            label="Horas"
            value={
              tarea.horas_estimadas || tarea.horas_reales > 0
                ? `${Number(tarea.horas_reales).toFixed(1)}h${tarea.horas_estimadas ? ` / ${tarea.horas_estimadas}h est.` : ""}`
                : null
            }
          />
          <DetailRow label="Entregable requerido" value={tarea.entregable_requerido} />
          <DetailRow label="Entregable / soporte final" value={tarea.entregable_soporte_url} />
          <DetailRow label="Entregable entregado" value={tarea.entregable} />
          <DetailRow label="Observaciones de publicación" value={tarea.notas_publicacion} />
          <DetailRow label="Observaciones de cierre" value={tarea.notas} />
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

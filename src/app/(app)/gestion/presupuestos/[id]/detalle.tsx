"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Link2, FileCheck, ChartBar, ListChecks } from "lucide-react";
import { actualizarPresupuesto, agregarCosto, actualizarCosto, eliminarCosto, importarDesdeCompras, restaurarBase } from "./actions";
import { money, type calcularPresupuesto, type calcularControlCostos } from "@/lib/finance";
import { useGuardado } from "@/lib/use-guardado";

type Presupuesto = {
  id: string;
  codigo: string | null;
  nombre: string;
  costos: number;
  admin_pct: number;
  margen_pct: number;
  resp_iva: boolean;
  iva_pct: number;
  valor_cotizado: number;
  proyectos: { id: string; codigo: string | null; nombre: string } | null;
  cotizaciones: { id: string; codigo: string | null; estado: string } | null;
};
type Costo = {
  id: string;
  categoria: string;
  descripcion: string | null;
  proveedor: string | null;
  presupuestado: number;
  real: number;
  estado: string;
  origen: string;
};
type BaseCotizacion = {
  codigo: string | null;
  fecha: string | null;
  cliente: string | null;
  nit: string | null;
  valorAprobado: number;
  items: { descripcion: string; cantidad: number; unidad: string; costoUnitario: number; unitClient: number; subtotal: number }[];
  subtotalCliente: number;
  ivaCliente: number;
  total: number;
};

const CATEGORIAS = ["Compras / insumos", "Servicios / profesionales", "Materiales / desgaste", "Transporte / logistica", "Viáticos", "Otros costos", "Costos directos"];
const ESTADOS = ["Planeado", "Cotizado", "Aprobado", "Pagado"];

export function PresupuestoDetalle({
  presupuesto,
  costos,
  f,
  control,
  baseCotizacion,
  hayCompras,
}: {
  presupuesto: Presupuesto;
  costos: Costo[];
  f: ReturnType<typeof calcularPresupuesto>;
  control: ReturnType<typeof calcularControlCostos>;
  baseCotizacion: BaseCotizacion | null;
  hayCompras: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Costo | null>(null);
  const { guardado, marcarGuardado } = useGuardado();

  function guardarBase(formData: FormData) {
    startTransition(async () => {
      const r = await actualizarPresupuesto(presupuesto.id, formData);
      if (r?.error) setError(r.error);
      else {
        setError(null);
        marcarGuardado();
      }
    });
  }

  function guardarItem(formData: FormData) {
    startTransition(async () => {
      const r = editingItem
        ? await actualizarCosto(presupuesto.id, editingItem.id, formData)
        : await agregarCosto(presupuesto.id, formData);
      if (r?.error) setError(r.error);
      else {
        setItemOpen(false);
        setEditingItem(null);
      }
    });
  }

  const pct = control.plan > 0 ? Math.round((control.real / control.plan) * 100) : 0;
  const pctBarra = Math.min(Math.max(pct, 0), 100);
  const excedido = control.real > control.plan && control.plan > 0;
  const alerta = excedido ? "danger" : pct >= 80 ? "warn" : "ok";

  return (
    <div className="p-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Link href="/gestion/presupuestos" className="text-sm text-emerald-700 hover:underline">
            ← Presupuestos
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-emerald-900">
            {presupuesto.proyectos?.codigo ?? "—"} · {presupuesto.nombre}
          </h1>
          <p className="text-sm text-neutral-500">
            Presupuestos · Cotización base {presupuesto.cotizaciones?.codigo ?? "—"} → control de costos
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <Link2 size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>El control parte de la cotización aprobada por el cliente.</strong> La base aprobada queda intacta como referencia. En el control del proyecto sí puedes modificar costos, agregar nuevos ítems o retirar ítems originalmente contemplados.
        </div>
      </div>

      {baseCotizacion && (
        <div className="mb-4 rounded-lg border-t-[3px] border-neutral-200 border-t-emerald-500 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-1.5 font-semibold text-emerald-900">
                <FileCheck size={16} /> Cotización base aprobada por el cliente
              </h2>
              <p className="text-xs text-neutral-500">Referencia histórica. Los cambios del control de costos no modifican esta cotización.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{baseCotizacion.codigo || "Cotización"}</span>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <Info label="Fecha aprobación" valor={baseCotizacion.fecha || "—"} />
            <Info label="Cliente" valor={baseCotizacion.cliente || "—"} />
            <Info label="NIT" valor={baseCotizacion.nit || "—"} />
            <Info label="Valor aprobado" valor={money.format(baseCotizacion.valorAprobado)} />
          </div>
          <div className="overflow-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                  <th className="px-3 py-2">Ítem aprobado</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">Costo base interno</th>
                  <th className="px-3 py-2 text-right">Valor unitario aprobado</th>
                  <th className="px-3 py-2 text-right">Subtotal aprobado</th>
                </tr>
              </thead>
              <tbody>
                {baseCotizacion.items.map((it, idx) => (
                  <tr key={idx} className="border-t border-neutral-100">
                    <td className="px-3 py-2">{it.descripcion}</td>
                    <td className="px-3 py-2 text-right">
                      {it.cantidad} {it.unidad}
                    </td>
                    <td className="px-3 py-2 text-right">{money.format(it.costoUnitario)}</td>
                    <td className="px-3 py-2 text-right">{money.format(it.unitClient)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{money.format(it.subtotal)}</td>
                  </tr>
                ))}
                {baseCotizacion.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                      La cotización vinculada no conserva detalle de ítems.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm">
            <Fila label="Subtotal aprobado antes de IVA" valor={money.format(baseCotizacion.subtotalCliente)} />
            <Fila label="IVA facturado al cliente" valor={money.format(baseCotizacion.ivaCliente)} />
            <Fila label="Total aprobado por el cliente" valor={money.format(baseCotizacion.total)} bold />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Kpi label="Valor aprobado" valor={money.format(f.valorCotizado)} sub="Según cotización base aprobada" />
        <Kpi label="Presupuesto vigente" valor={money.format(control.plan)} sub="Ítems actuales del control" />
        <Kpi label="Costo real acumulado" valor={money.format(control.real)} sub={`${pct}% ejecutado`} warn={excedido} />
        <Kpi label="Ganancia estimada" valor={money.format(control.gananciaEst)} sub="Valor aprobado − costos vigentes" warn={control.gananciaEst < 0} />
      </div>

      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold text-emerald-900">
            <ChartBar size={16} /> Ejecución del presupuesto
          </h2>
        </div>
        <div className="mb-1 flex items-center justify-between text-sm text-neutral-600">
          <span>Costo real registrado</span>
          <span>
            <strong>{money.format(control.real)}</strong> de {money.format(control.plan)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full ${alerta === "danger" ? "bg-red-600" : alerta === "warn" ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${pctBarra}%` }}
          />
        </div>
        <div
          className={`mt-3 rounded-md border p-3 text-sm ${
            alerta === "danger"
              ? "border-red-200 bg-red-50 text-red-800"
              : alerta === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {alerta === "danger"
            ? "El costo real supera el presupuesto vigente. La utilidad del proyecto está siendo afectada."
            : alerta === "warn"
              ? `El proyecto ya consumió ${pct}% del presupuesto. Revisa los costos pendientes antes de continuar.`
              : "El costo real se encuentra dentro del presupuesto vigente."}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Mini label="Disponible" valor={money.format(control.disponible)} warn={control.disponible < 0} />
          <Mini label="Ganancia según costos reales" valor={money.format(control.gananciaActual)} warn={control.gananciaActual < 0} />
          <Mini label="Costos admin. + IVA de los costos del proyecto" valor={money.format(f.admin + f.iva)} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <form action={guardarBase} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">Datos base del presupuesto</h2>
          <Campo label="Nombre">
            <input name="nombre" defaultValue={presupuesto.nombre} required className="in" />
          </Campo>
          <Campo label="Costo directo base (referencia de la cotización aprobada)">
            <input type="number" step="0.01" name="costos" defaultValue={presupuesto.costos} className="in" />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Costos administrativos (%)">
              <input type="number" step="0.1" name="admin_pct" defaultValue={presupuesto.admin_pct} className="in" />
            </Campo>
            <Campo label="Margen objetivo (%)">
              <input type="number" step="0.1" name="margen_pct" defaultValue={presupuesto.margen_pct} className="in" />
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 pt-5 text-sm">
              <input type="checkbox" name="resp_iva" defaultChecked={presupuesto.resp_iva} />
              Aplica IVA
            </label>
            <Campo label="Tarifa de IVA (%)">
              <input type="number" step="0.1" name="iva_pct" defaultValue={presupuesto.iva_pct} className="in" />
            </Campo>
          </div>
          <Campo label="Valor cotizado al cliente">
            <input type="number" step="0.01" name="valor_cotizado" defaultValue={presupuesto.valor_cotizado} className="in" />
            {baseCotizacion && Math.abs(Number(presupuesto.valor_cotizado) - baseCotizacion.valorAprobado) > 1 && (
              <p className="mt-1 text-xs text-amber-700">
                Difiere de la cotización {baseCotizacion.codigo ?? ""} ({money.format(baseCotizacion.valorAprobado)}).
                Este valor es el que usan el control del proyecto y los reportes.
              </p>
            )}
          </Campo>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              Guardar cambios
            </button>
            {guardado && <span className="text-sm font-medium text-emerald-700">✓ Cambios guardados</span>}
          </div>
        </form>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm">
          <h2 className="font-semibold text-emerald-900">Resumen financiero</h2>

          <p className="mt-2 text-xs font-semibold uppercase text-neutral-400">Referencia · cotización aprobada</p>
          <p className="mb-1 text-xs text-neutral-400">
            Cifras fijas de la oferta que aceptó el cliente (costos administrativos e IVA se calculan sobre este costo, como el Anexo 2). No cambian al ajustar el control de costos.
          </p>
          <Fila label="Costo directo (cotización aprobada)" valor={money.format(f.costos)} />
          <Fila label={`Costos administrativos (${presupuesto.admin_pct}%)`} valor={money.format(f.admin)} />
          <Fila label={`Utilidad esperada (${presupuesto.margen_pct}%)`} valor={money.format(f.utilidadEsperada)} />
          <Fila label="Valor" valor={money.format(f.valor)} bold />
          <Fila label={`IVA (${presupuesto.iva_pct}%)`} valor={money.format(f.iva)} />

          <div className="my-3 border-t border-neutral-100" />
          <p className="text-xs font-semibold uppercase text-neutral-400">Control del proyecto · líneas vigentes</p>
          <p className="mb-1 text-xs text-neutral-400">Se mueven con lo que registres en el control de costos de abajo.</p>
          <Fila label="Presupuesto vigente (plan)" valor={money.format(control.plan)} />
          <Fila label="Costo real ejecutado" valor={money.format(control.real)} />
          <Fila label="Disponible (plan − real)" valor={money.format(control.disponible)} />
          <Fila label="Ganancia estimada (vs. plan)" valor={money.format(control.gananciaEst)} bold />
          <Fila label="Ganancia según costos reales" valor={money.format(control.gananciaActual)} bold />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <ListChecks size={16} /> Plan de costos del proyecto
            </h2>
            <p className="text-xs text-neutral-500">
              Empieza con los ítems de la cotización base. Aquí ajustas lo <strong>presupuestado</strong>; el costo real ejecutado sale de las compras del proyecto.
            </p>
          </div>
          <div className="flex gap-2">
            {presupuesto.cotizaciones && (
              <button
                onClick={() =>
                  startTransition(async () => {
                    const r = await restaurarBase(presupuesto.id);
                    if (r?.error) setError(r.error);
                  })
                }
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                ↻ Restaurar base
              </button>
            )}
            {presupuesto.proyectos && !hayCompras && (
              <button
                onClick={() =>
                  startTransition(async () => {
                    const r = await importarDesdeCompras(presupuesto.id, presupuesto.proyectos!.id);
                    if (r?.error) setError(r.error);
                  })
                }
                className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200"
              >
                Importar desde Compras
              </button>
            )}
            <button
              onClick={() => {
                setEditingItem(null);
                setItemOpen(true);
              }}
              className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              + Agregar costo
            </button>
          </div>
        </div>
        {hayCompras && (
          <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">
            El <strong>costo real ejecutado</strong> ({money.format(control.real)}) se toma de las compras registradas contra este proyecto y se actualiza solo. La columna &quot;Real&quot; de abajo es de referencia y no se edita a mano.
          </p>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-neutral-500">
              <th className="py-1">Origen</th>
              <th className="py-1">Categoría</th>
              <th className="py-1">Descripción</th>
              <th className="py-1">Proveedor / responsable</th>
              <th className="py-1 text-right">Presupuestado</th>
              <th className="py-1 text-right">Real{hayCompras ? " (ref.)" : " ejecutado"}</th>
              <th className="py-1 text-right">Variación</th>
              <th className="py-1">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {costos.map((c) => (
              <CostoRow
                key={c.id}
                costo={c}
                presupuestoId={presupuesto.id}
                hayCompras={hayCompras}
                onDelete={() => startTransition(async () => { await eliminarCosto(presupuesto.id, c.id); })}
                pending={pending}
              />
            ))}
            {costos.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-neutral-400">
                  No hay ítems en el plan. Usa &quot;Restaurar base&quot; o &quot;Agregar costo&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {itemOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setItemOpen(false)}>
          <form action={guardarItem} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">{editingItem ? "Editar" : "Agregar"} costo</h2>
            <div className="space-y-3">
              <Campo label="Categoría">
                <select name="categoria" defaultValue={editingItem?.categoria ?? CATEGORIAS[0]} className="in">
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Descripción">
                <input name="descripcion" defaultValue={editingItem?.descripcion ?? ""} className="in" />
              </Campo>
              <Campo label="Proveedor / responsable">
                <input name="proveedor" defaultValue={editingItem?.proveedor ?? ""} className="in" />
              </Campo>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo label="Presupuestado">
                  <input type="number" step="0.01" name="presupuestado" defaultValue={editingItem?.presupuestado ?? 0} className="in" />
                </Campo>
                {hayCompras ? (
                  <input type="hidden" name="real" value={editingItem?.real ?? 0} />
                ) : (
                  <Campo label="Real ejecutado">
                    <input type="number" step="0.01" name="real" defaultValue={editingItem?.real ?? 0} className="in" />
                  </Campo>
                )}
              </div>
              <Campo label="Estado">
                <select name="estado" defaultValue={editingItem?.estado ?? "Planeado"} className="in">
                  {ESTADOS.map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </Campo>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setItemOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

function Fila({ label, valor, bold }: { label: string; valor: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? "font-semibold text-emerald-900" : "text-neutral-600"}`}>
      <span>{label}</span>
      <span>{valor}</span>
    </div>
  );
}

function Kpi({ label, valor, sub, warn }: { label: string; valor: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border-t-[3px] border-neutral-200 border-t-emerald-500 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${warn ? "text-red-600" : "text-emerald-900"}`}>{valor}</div>
      {sub && <div className="text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="font-medium text-neutral-700">{valor}</div>
    </div>
  );
}

function Mini({ label, valor, warn }: { label: string; valor: string; warn?: boolean }) {
  return (
    <div className="rounded-md bg-neutral-50 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`mt-0.5 font-semibold ${warn ? "text-red-600" : "text-emerald-900"}`}>{valor}</div>
    </div>
  );
}

const ORIGENES_BASE = new Set(["Presupuesto"]);
function OrigenBadge({ origen }: { origen: string }) {
  const esBase = ORIGENES_BASE.has(origen);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${esBase ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
      {esBase ? "Cotización base" : "Agregado al proyecto"}
    </span>
  );
}

/** Cada campo se edita en línea directo en la fila — categoría/estado guardan al cambiar, texto/números al perder foco. */
function CostoRow({
  costo,
  presupuestoId,
  hayCompras,
  onDelete,
  pending,
}: {
  costo: Costo;
  presupuestoId: string;
  hayCompras: boolean;
  onDelete: () => void;
  pending: boolean;
}) {
  const [pendingRow, startTransition] = useTransition();
  const [categoria, setCategoria] = useState(costo.categoria);
  const [descripcion, setDescripcion] = useState(costo.descripcion ?? "");
  const [proveedor, setProveedor] = useState(costo.proveedor ?? "");
  const [presupuestado, setPresupuestado] = useState(String(costo.presupuestado));
  const [real, setReal] = useState(String(costo.real));
  const [estado, setEstado] = useState(costo.estado);

  function guardar(overrides: Partial<Record<"categoria" | "descripcion" | "proveedor" | "presupuestado" | "real" | "estado", string>> = {}) {
    const valores = { categoria, descripcion, proveedor, presupuestado, real, estado, ...overrides };
    const fd = new FormData();
    for (const [k, v] of Object.entries(valores)) fd.set(k, v);
    startTransition(async () => {
      await actualizarCosto(presupuestoId, costo.id, fd);
    });
  }

  const disponible = Number(presupuestado || 0) - Number(real || 0);
  const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1 text-xs";

  return (
    <tr className="border-t border-neutral-100">
      <td className="py-1.5 pr-2">
        <OrigenBadge origen={costo.origen} />
      </td>
      <td className="py-1.5 pr-2">
        <select value={categoria} onChange={(e) => { setCategoria(e.target.value); guardar({ categoria: e.target.value }); }} className={inputClass}>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 pr-2">
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} onBlur={() => guardar()} className={inputClass} />
      </td>
      <td className="py-1.5 pr-2">
        <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} onBlur={() => guardar()} className={inputClass} />
      </td>
      <td className="py-1.5 pr-2">
        <input type="number" step="0.01" value={presupuestado} onChange={(e) => setPresupuestado(e.target.value)} onBlur={() => guardar()} className={`${inputClass} text-right`} />
      </td>
      <td className="py-1.5 pr-2">
        {hayCompras ? (
          <div className="px-2 py-1 text-right text-xs text-neutral-400">{money.format(Number(real || 0))}</div>
        ) : (
          <input type="number" step="0.01" value={real} onChange={(e) => setReal(e.target.value)} onBlur={() => guardar()} className={`${inputClass} text-right`} />
        )}
      </td>
      <td className={`py-1.5 pr-2 text-right ${disponible < 0 ? "text-red-600" : ""}`}>{money.format(disponible)}</td>
      <td className="py-1.5 pr-2">
        <select value={estado} onChange={(e) => { setEstado(e.target.value); guardar({ estado: e.target.value }); }} className={inputClass}>
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 text-right">
        <button onClick={onDelete} disabled={pending || pendingRow} title="Quitar" className="text-red-600 hover:text-red-800 disabled:opacity-50">
          🗑
        </button>
      </td>
    </tr>
  );
}

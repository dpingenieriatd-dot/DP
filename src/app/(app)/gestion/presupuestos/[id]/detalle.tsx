"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { actualizarPresupuesto, agregarCosto, actualizarCosto, eliminarCosto, importarDesdeCompras, restaurarBase } from "./actions";
import { money, type calcularPresupuesto, type calcularControlCostos } from "@/lib/finance";

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

const CATEGORIAS = ["Compras / insumos", "Servicios / profesionales", "Materiales / desgaste", "Transporte / logistica", "Viáticos", "Otros costos", "Costos directos"];
const ESTADOS = ["Planeado", "Cotizado", "Aprobado", "Pagado"];

export function PresupuestoDetalle({
  presupuesto,
  costos,
  f,
  control,
}: {
  presupuesto: Presupuesto;
  costos: Costo[];
  f: ReturnType<typeof calcularPresupuesto>;
  control: ReturnType<typeof calcularControlCostos>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Costo | null>(null);

  function guardarBase(formData: FormData) {
    startTransition(async () => {
      const r = await actualizarPresupuesto(presupuesto.id, formData);
      if (r?.error) setError(r.error);
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

  return (
    <div className="p-8">
      <Link href="/gestion/presupuestos" className="text-sm text-emerald-700 hover:underline">
        ← Presupuestos
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-emerald-900">
        {presupuesto.codigo || "(sin código)"} · {presupuesto.nombre}
      </h1>
      {presupuesto.proyectos && (
        <p className="text-sm text-neutral-500">
          Proyecto:{" "}
          <Link href={`/gestion/proyectos/${presupuesto.proyectos.id}`} className="text-emerald-700 hover:underline">
            {presupuesto.proyectos.codigo ? `${presupuesto.proyectos.codigo} · ` : ""}
            {presupuesto.proyectos.nombre}
          </Link>
        </p>
      )}
      {presupuesto.cotizaciones && (
        <p className="text-sm text-neutral-500">
          Cotización base aprobada por el cliente:{" "}
          <Link href="/gestion/cotizaciones" className="text-emerald-700 hover:underline">
            {presupuesto.cotizaciones.codigo || "(sin código)"}
          </Link>{" "}
          <span className="text-xs text-neutral-400">({presupuesto.cotizaciones.estado})</span>
        </p>
      )}

      <div className={`mt-4 rounded-lg border p-4 ${control.disponible >= 0 ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
        <p className="text-sm">
          {control.disponible >= 0
            ? "✅ El costo real se encuentra dentro del presupuesto vigente."
            : `⚠ El costo real superó el presupuesto vigente por ${money.format(-control.disponible)}.`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Disponible" valor={money.format(control.disponible)} warn={control.disponible < 0} />
        <Kpi label="Ganancia según costos reales" valor={money.format(control.gananciaActual)} warn={control.gananciaActual < 0} />
        <Kpi label="Costos admin. + IVA" valor={money.format(f.admin + f.iva)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <form action={guardarBase} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">Datos base del presupuesto</h2>
          <Campo label="Nombre">
            <input name="nombre" defaultValue={presupuesto.nombre} required className="in" />
          </Campo>
          <Campo label="Costo directo base">
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
          </Campo>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            Guardar cambios
          </button>
        </form>

        <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm">
          <h2 className="mb-2 font-semibold text-emerald-900">Resumen financiero</h2>
          <Fila label="Costo directo" valor={money.format(f.costos)} />
          <Fila label={`Costos administrativos (${presupuesto.admin_pct}%)`} valor={money.format(f.admin)} />
          <Fila label={`Utilidad esperada (${presupuesto.margen_pct}%)`} valor={money.format(f.utilidadEsperada)} />
          <Fila label="Valor" valor={money.format(f.valor)} bold />
          <Fila label={`IVA de los costos del proyecto (${presupuesto.iva_pct}%)`} valor={money.format(f.iva)} />
          <Fila label="Valor sugerido al cliente" valor={money.format(f.valorSugerido)} bold />
          <div className="my-2 border-t border-neutral-100" />
          <Fila label="Disponible (plan − real)" valor={money.format(control.disponible)} />
          <Fila label="Ganancia estimada (vs. plan)" valor={money.format(control.gananciaEst)} bold />
          <Fila label="Ganancia según costos reales" valor={money.format(control.gananciaActual)} bold />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-emerald-900">Costos del proyecto</h2>
            <p className="text-xs text-neutral-500">Modifica el valor presupuestado y registra el valor real a medida que se ejecuta.</p>
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
            {presupuesto.proyectos && (
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
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-neutral-500">
              <th className="py-1">Categoría</th>
              <th className="py-1">Descripción</th>
              <th className="py-1">Proveedor / responsable</th>
              <th className="py-1 text-right">Presupuestado</th>
              <th className="py-1 text-right">Real ejecutado</th>
              <th className="py-1 text-right">Disponible</th>
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
                onDelete={() => startTransition(async () => { await eliminarCosto(presupuesto.id, c.id); })}
                pending={pending}
              />
            ))}
            {costos.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-neutral-400">
                  No hay costos registrados. Usa &quot;Restaurar base&quot;, &quot;Agregar costo&quot; o &quot;Importar desde Compras&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5 text-sm">
        <Fila label="Total presupuesto vigente" valor={money.format(control.plan)} />
        <Fila label="Total costo real" valor={money.format(control.real)} />
        <Fila label="Costos administrativos" valor={money.format(f.admin)} />
        <Fila label="IVA de los costos del proyecto" valor={money.format(f.iva)} />
        <div className="my-2 border-t border-neutral-100" />
        <Fila label="Ganancia estimada del proyecto" valor={money.format(control.gananciaEst)} bold />
        <Fila label="Ganancia según costos reales registrados" valor={money.format(control.gananciaActual)} bold />
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
                <Campo label="Real ejecutado">
                  <input type="number" step="0.01" name="real" defaultValue={editingItem?.real ?? 0} className="in" />
                </Campo>
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
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${warn ? "text-red-600" : "text-emerald-900"}`}>{valor}</div>
      {sub && <div className="text-xs text-neutral-400">{sub}</div>}
    </div>
  );
}

/** Cada campo se edita en línea directo en la fila — categoría/estado guardan al cambiar, texto/números al perder foco. */
function CostoRow({
  costo,
  presupuestoId,
  onDelete,
  pending,
}: {
  costo: Costo;
  presupuestoId: string;
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
        <input type="number" step="0.01" value={real} onChange={(e) => setReal(e.target.value)} onBlur={() => guardar()} className={`${inputClass} text-right`} />
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

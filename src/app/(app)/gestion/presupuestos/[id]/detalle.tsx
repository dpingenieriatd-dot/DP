"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { actualizarPresupuesto, agregarCosto, actualizarCosto, eliminarCosto, importarDesdeCompras } from "./actions";
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
};
type Costo = {
  id: string;
  categoria: string;
  descripcion: string | null;
  proveedor: string | null;
  presupuestado: number;
  real: number;
  estado: string;
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

      <div className={`mt-4 rounded-lg border p-4 ${f.viable ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
        <div className="text-xs font-semibold uppercase opacity-70">{f.viable ? "✅ Viable" : "❌ No viable"}</div>
        <p className="text-sm">
          Valor cotizado {money.format(f.valorCotizado)} {f.viable ? "alcanza" : "no alcanza"} el valor sugerido{" "}
          {money.format(f.valorSugerido)} (diferencia {money.format(f.margenNeg)}).
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Valor cotizado" valor={money.format(f.valorCotizado)} sub="Precio de venta al cliente" />
        <Kpi label="Presupuesto vigente" valor={money.format(control.plan)} sub="Costo planeado" />
        <Kpi label="Costo real acumulado" valor={money.format(control.real)} warn={control.real > control.plan} />
        <Kpi label="Ganancia estimada" valor={money.format(control.gananciaEst)} warn={control.gananciaEst < 0} />
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
          <Fila label={`IVA (${presupuesto.iva_pct}%)`} valor={money.format(f.iva)} />
          <Fila label="Valor sugerido al cliente" valor={money.format(f.valorSugerido)} bold />
          <div className="my-2 border-t border-neutral-100" />
          <Fila label="Disponible (plan − real)" valor={money.format(control.disponible)} />
          <Fila label="Ganancia estimada (vs. plan)" valor={money.format(control.gananciaEst)} bold />
          <Fila label="Ganancia según costos reales" valor={money.format(control.gananciaActual)} bold />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-emerald-900">Costos del proyecto</h2>
          <div className="flex gap-2">
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
              <th className="py-1">Proveedor</th>
              <th className="py-1 text-right">Presupuestado</th>
              <th className="py-1 text-right">Real</th>
              <th className="py-1 text-right">Disponible</th>
              <th className="py-1">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {costos.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100">
                <td className="py-1.5">{c.categoria}</td>
                <td className="py-1.5">{c.descripcion || "—"}</td>
                <td className="py-1.5">{c.proveedor || "—"}</td>
                <td className="py-1.5 text-right">{money.format(c.presupuestado)}</td>
                <td className="py-1.5 text-right">{money.format(c.real)}</td>
                <td className={`py-1.5 text-right ${c.presupuestado - c.real < 0 ? "text-red-600" : ""}`}>{money.format(c.presupuestado - c.real)}</td>
                <td className="py-1.5">{c.estado}</td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => {
                      setEditingItem(c);
                      setItemOpen(true);
                    }}
                    className="mr-2 text-xs text-emerald-700 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await eliminarCosto(presupuesto.id, c.id);
                      })
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
            {costos.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-neutral-400">
                  No hay costos registrados. Usa &quot;Agregar costo&quot; o &quot;Importar desde Compras&quot;.
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

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { actualizarProyecto, agregarItemPresupuesto, eliminarItemPresupuesto } from "./actions";
import { money, type calcularFinanzas } from "@/lib/finance";

type Proyecto = {
  id: string;
  codigo: string | null;
  nombre: string;
  cliente_id: string | null;
  responsable_id: string | null;
  presupuesto_directo: number;
  admin_pct: number | null;
  margen_pct: number;
  contrato_valor: number;
  iva_aplica: boolean;
  iva_pct: number;
  contrato_incluye_iva: boolean;
  retencion_pct: number;
  ica_pct: number;
  otras_retenciones: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  notas: string | null;
};
type Item = { id: string; recurso: string; cantidad: number; unidad: string | null; valor_unitario: number };
type Compra = { id: string; fecha: string; cantidad: number; valor_unitario: number; estado_pago: string; categoria: string | null };

const NIVEL_CLASS: Record<string, string> = {
  green: "border-emerald-300 bg-emerald-50 text-emerald-800",
  yellow: "border-amber-300 bg-amber-50 text-amber-800",
  orange: "border-orange-300 bg-orange-50 text-orange-800",
  red: "border-red-300 bg-red-50 text-red-800",
};

export function ProyectoDetalle({
  proyecto,
  clientes,
  profiles,
  items,
  compras,
  finanzas,
}: {
  proyecto: Proyecto;
  clientes: { id: string; nombre: string }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  items: Item[];
  compras: Compra[];
  finanzas: ReturnType<typeof calcularFinanzas>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  function guardar(formData: FormData) {
    startTransition(async () => {
      const r = await actualizarProyecto(proyecto.id, formData);
      if (r?.error) setError(r.error);
      else setError(null);
    });
  }

  function agregarItem(formData: FormData) {
    startTransition(async () => {
      const r = await agregarItemPresupuesto(proyecto.id, formData);
      if (r?.error) setItemError(r.error);
      else setItemError(null);
    });
  }

  return (
    <div className="p-8">
      <Link href="/gestion/proyectos" className="text-sm text-emerald-700 hover:underline">
        ← Proyectos
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-emerald-900">
        {proyecto.codigo || "(sin código)"} · {proyecto.nombre}
      </h1>

      <div className="mt-6 grid grid-cols-[1.2fr_1fr] gap-6">
        <div className="space-y-6">
          <form action={guardar} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold text-emerald-900">Datos del proyecto</h2>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nombre" full>
                <input name="nombre" defaultValue={proyecto.nombre} required className="in" />
              </Campo>
              <Campo label="Cliente">
                <select name="cliente_id" defaultValue={proyecto.cliente_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Responsable">
                <select name="responsable_id" defaultValue={proyecto.responsable_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Estado">
                <select name="estado" defaultValue={proyecto.estado} className="in">
                  <option>Planeado</option>
                  <option>En ejecución</option>
                  <option>Finalizado</option>
                  <option>Cancelado</option>
                </select>
              </Campo>
              <Campo label="Fecha de inicio">
                <input type="date" name="fecha_inicio" defaultValue={proyecto.fecha_inicio ?? ""} className="in" />
              </Campo>
              <Campo label="Fecha de cierre">
                <input type="date" name="fecha_fin" defaultValue={proyecto.fecha_fin ?? ""} className="in" />
              </Campo>
            </div>

            <h2 className="pt-2 font-semibold text-emerald-900">Costos y precio</h2>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Costos administrativos (%)">
                <input type="number" step="0.1" name="admin_pct" defaultValue={proyecto.admin_pct ?? ""} placeholder="Usa el valor de Configuración si se deja vacío" className="in" />
              </Campo>
              <Campo label="Margen de utilidad objetivo (%)">
                <input type="number" step="0.1" name="margen_pct" defaultValue={proyecto.margen_pct} className="in" />
              </Campo>
              <Campo label="Valor contratado con el cliente">
                <input type="number" step="0.01" name="contrato_valor" defaultValue={proyecto.contrato_valor} className="in" />
              </Campo>
              <Campo label="¿Aplica IVA?">
                <label className="flex items-center gap-2 pt-2 text-sm">
                  <input type="checkbox" name="iva_aplica" defaultChecked={proyecto.iva_aplica} />
                  Sí aplica
                </label>
              </Campo>
              <Campo label="Tarifa de IVA (%)">
                <input type="number" step="0.1" name="iva_pct" defaultValue={proyecto.iva_pct} className="in" />
              </Campo>
              <Campo label="¿El valor contratado incluye IVA?">
                <label className="flex items-center gap-2 pt-2 text-sm">
                  <input type="checkbox" name="contrato_incluye_iva" defaultChecked={proyecto.contrato_incluye_iva} />
                  Sí lo incluye
                </label>
              </Campo>
              <Campo label="Retención en la fuente (%)">
                <input type="number" step="0.01" name="retencion_pct" defaultValue={proyecto.retencion_pct} className="in" />
              </Campo>
              <Campo label="Retención ICA (%)">
                <input type="number" step="0.001" name="ica_pct" defaultValue={proyecto.ica_pct} className="in" />
              </Campo>
              <Campo label="Otras retenciones / descuentos">
                <input type="number" step="0.01" name="otras_retenciones" defaultValue={proyecto.otras_retenciones} className="in" />
              </Campo>
            </div>
            <Campo label="Observaciones" full>
              <textarea name="notas" defaultValue={proyecto.notas ?? ""} className="in" />
            </Campo>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold text-emerald-900">Presupuesto de costos directos</h2>
            <form action={agregarItem} className="mt-3 grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
              <input name="recurso" placeholder="Recurso, insumo o servicio" required className="in" />
              <input name="cantidad" type="number" step="0.01" defaultValue={1} className="in" />
              <input name="unidad" placeholder="Unidad" className="in" />
              <input name="valor_unitario" type="number" step="0.01" placeholder="Valor unitario" className="in" />
              <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                Agregar
              </button>
            </form>
            {itemError && <p className="mt-2 text-sm text-red-600">{itemError}</p>}
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500">
                  <th className="py-1">Recurso</th>
                  <th className="py-1 text-right">Cant.</th>
                  <th className="py-1">Unidad</th>
                  <th className="py-1 text-right">Vr. unitario</th>
                  <th className="py-1 text-right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-neutral-100">
                    <td className="py-1.5">{it.recurso}</td>
                    <td className="py-1.5 text-right">{it.cantidad}</td>
                    <td className="py-1.5">{it.unidad || "—"}</td>
                    <td className="py-1.5 text-right">{money.format(it.valor_unitario)}</td>
                    <td className="py-1.5 text-right font-medium">{money.format(it.cantidad * it.valor_unitario)}</td>
                    <td className="py-1.5 text-right">
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await eliminarItemPresupuesto(proyecto.id, it.id);
                          })
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-neutral-400">
                      Agrega los recursos necesarios para ejecutar el proyecto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mt-2 flex justify-end text-sm font-semibold text-emerald-900">
              Total costos directos: {money.format(finanzas.direct)}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold text-emerald-900">Compras registradas ({compras.length})</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500">
                  <th className="py-1">Fecha</th>
                  <th className="py-1">Categoría</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1">Estado pago</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-100">
                    <td className="py-1.5">{c.fecha}</td>
                    <td className="py-1.5">{c.categoria || "—"}</td>
                    <td className="py-1.5 text-right">{money.format(c.cantidad * c.valor_unitario)}</td>
                    <td className="py-1.5">{c.estado_pago}</td>
                  </tr>
                ))}
                {compras.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-neutral-400">
                      Sin compras registradas todavía — ve al módulo Compras para agregar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`rounded-lg border p-5 ${NIVEL_CLASS[finanzas.nivel]}`}>
            <div className="text-xs font-semibold uppercase opacity-70">Diagnóstico</div>
            <div className="text-xl font-bold">{finanzas.etiqueta}</div>
            <p className="mt-1 text-sm">Margen estimado (según presupuesto): {finanzas.margenEstimadoPct.toFixed(1)}%</p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm">
            <h3 className="mb-2 font-semibold text-emerald-900">Resumen financiero</h3>
            <Fila label="Costo directo" valor={money.format(finanzas.direct)} />
            <Fila label={`Costos administrativos (${finanzas.adminPct}%)`} valor={money.format(finanzas.admin)} />
            <Fila label="Costo total presupuestado" valor={money.format(finanzas.totalCostoPresupuestado)} bold />
            <Fila label="Precio mínimo sugerido antes de IVA" valor={money.format(finanzas.sugerido)} />
            <div className="my-2 border-t border-neutral-100" />
            <Fila label="Valor del servicio antes de IVA" valor={money.format(finanzas.baseValue)} />
            <Fila label="IVA" valor={money.format(finanzas.ivaValue)} />
            <Fila label="Total de la factura" valor={money.format(finanzas.invoiceTotal)} />
            <Fila label="Retenciones estimadas" valor={money.format(finanzas.retencionValue + finanzas.icaValue + Number(proyecto.otras_retenciones || 0))} />
            <Fila label="Efectivo esperado" valor={money.format(finanzas.netCash)} bold />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm">
            <h3 className="mb-2 font-semibold text-emerald-900">Utilidad estimada vs. real</h3>
            <Fila label="Utilidad estimada (contra presupuesto)" valor={money.format(finanzas.utilidadEstimada)} bold />
            <Fila label="Margen estimado" valor={`${finanzas.margenEstimadoPct.toFixed(1)}%`} />
            <div className="my-2 border-t border-neutral-100" />
            <Fila label="Compras ejecutadas" valor={money.format(finanzas.comprasEjecutadas)} />
            {finanzas.hayComprasRegistradas ? (
              <>
                <Fila label="Utilidad real (contra compras)" valor={money.format(finanzas.utilidadReal!)} bold />
                <Fila label="Margen real" valor={`${finanzas.margenRealPct!.toFixed(1)}%`} />
              </>
            ) : (
              <p className="mt-2 rounded-md bg-neutral-50 p-2 text-xs text-neutral-500">
                Todavía no hay compras registradas para este proyecto, así que la utilidad real no se puede calcular
                todavía — no se muestra como si fuera 100%.
              </p>
            )}
            <Fila label="Desviación del presupuesto" valor={money.format(finanzas.desviacionPresupuesto)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "col-span-2" : ""}`}>
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

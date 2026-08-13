"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { actualizarProyecto } from "./actions";
import { money, type calcularPresupuesto, type calcularControlCostos } from "@/lib/finance";

type Proyecto = {
  id: string;
  codigo: string | null;
  nombre: string;
  cliente_id: string | null;
  empresa_id: string | null;
  responsable_id: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string | null;
};
type Compra = { id: string; fecha: string; cantidad: number; valor_unitario: number; estado_pago: string; categoria: string | null; proveedores: { nombre: string } | null };
type PresupuestoCalc = { pre: { id: string; codigo: string | null; nombre: string }; f: ReturnType<typeof calcularPresupuesto>; control: ReturnType<typeof calcularControlCostos> };

export function ProyectoDetalle({
  proyecto,
  clientes,
  empresas,
  profiles,
  presupuestos,
  compras,
}: {
  proyecto: Proyecto;
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  presupuestos: PresupuestoCalc[];
  compras: Compra[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guardar(formData: FormData) {
    startTransition(async () => {
      const r = await actualizarProyecto(proyecto.id, formData);
      if (r?.error) setError(r.error);
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <form action={guardar} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">Datos del proyecto</h2>
          <Campo label="Nombre">
            <input name="nombre" defaultValue={proyecto.nombre} required className="in" />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <Campo label="Empresa atendida">
              <select name="empresa_id" defaultValue={proyecto.empresa_id ?? ""} className="in">
                <option value="">Seleccione…</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
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
                <option>Planeacion</option>
                <option>En ejecucion</option>
                <option>Suspendido</option>
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
          <Campo label="Observaciones">
            <textarea name="notas" defaultValue={proyecto.notas ?? ""} className="in" />
          </Campo>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            Guardar cambios
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-emerald-900">Presupuestos ({presupuestos.length})</h2>
              <Link
                href={{ pathname: "/gestion/presupuestos" }}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                + Nuevo presupuesto para este proyecto
              </Link>
            </div>
            <div className="space-y-2">
              {presupuestos.map(({ pre, f, control }) => (
                <Link
                  key={pre.id}
                  href={`/gestion/presupuestos/${pre.id}`}
                  className="block rounded-md border border-neutral-100 p-3 text-sm hover:bg-neutral-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-800">
                      {pre.codigo || "(sin código)"} · {pre.nombre}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.viable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {f.viable ? "✅ Viable" : "❌ No viable"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    Cotizado {money.format(f.valorCotizado)} · Plan {money.format(control.plan)} · Real {money.format(control.real)} · Ganancia
                    est. {money.format(control.gananciaEst)}
                  </div>
                </Link>
              ))}
              {presupuestos.length === 0 && <p className="text-sm text-neutral-400">Este proyecto todavía no tiene presupuestos.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="mb-2 font-semibold text-emerald-900">Compras registradas ({compras.length})</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-neutral-500">
                  <th className="py-1">Fecha</th>
                  <th className="py-1">Proveedor</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1">Estado</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => (
                  <tr key={c.id} className="border-t border-neutral-100">
                    <td className="py-1.5">{c.fecha}</td>
                    <td className="py-1.5">{c.proveedores?.nombre || "—"}</td>
                    <td className="py-1.5 text-right">{money.format(c.cantidad * c.valor_unitario)}</td>
                    <td className="py-1.5">{c.estado_pago}</td>
                  </tr>
                ))}
                {compras.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-neutral-400">
                      Sin compras registradas todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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

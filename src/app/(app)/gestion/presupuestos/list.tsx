"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { crearPresupuesto } from "./actions";
import { money, type calcularPresupuesto, type calcularControlCostos } from "@/lib/finance";

type Fila = {
  pre: { id: string; codigo: string | null; nombre: string; proyecto_id: string; created_at: string };
  f: ReturnType<typeof calcularPresupuesto>;
  control: ReturnType<typeof calcularControlCostos>;
  proyecto: string;
  cliente: string;
  nit: string;
};

export function PresupuestosList({ filas, proyectos }: { filas: Fila[]; proyectos: { id: string; codigo: string | null; nombre: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [viabilidadFiltro, setViabilidadFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const visibles = filas
    .filter(({ f }) => !viabilidadFiltro || (viabilidadFiltro === "viable" ? f.viable : !f.viable))
    .filter(({ pre }) => !desde || pre.created_at.slice(0, 10) >= desde)
    .filter(({ pre }) => !hasta || pre.created_at.slice(0, 10) <= hasta)
    .filter(
      ({ pre, proyecto, cliente, nit }) =>
        !busqueda || `${pre.codigo ?? ""} ${pre.nombre} ${proyecto} ${cliente} ${nit}`.toLowerCase().includes(busqueda.toLowerCase())
    );
  const hayFiltros = !!(viabilidadFiltro || desde || hasta || busqueda);

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await crearPresupuesto(formData);
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">Presupuestos</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{filas.length}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Panel principal · Control de costos y ganancia por proyecto</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar presupuesto, proyecto..."
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button onClick={() => setOpen(true)} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            + Nuevo presupuesto
          </button>
          <button type="button" disabled title="Próximamente" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-400">
            Columnas / vistas
          </button>
        </div>
      </div>
      <p className="mb-4 rounded-md bg-sky-50 p-3 text-sm text-sky-800">
        <strong>Cotización y presupuesto son diferentes.</strong> La cotización es el precio ofrecido al cliente; este
        módulo registra lo que realmente cuesta ejecutar el proyecto y controla la ganancia. Un proyecto puede tener
        más de un presupuesto (por ejemplo, uno por cada servicio o entregable).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-neutral-600">
          Viabilidad{" "}
          <select value={viabilidadFiltro} onChange={(e) => setViabilidadFiltro(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">Todas</option>
            <option value="viable">✅ Viable</option>
            <option value="no_viable">❌ No viable</option>
          </select>
        </label>
        <label className="text-sm text-neutral-600">
          Creado desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm text-neutral-600">
          Creado hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        {hayFiltros && (
          <button
            onClick={() => {
              setViabilidadFiltro("");
              setDesde("");
              setHasta("");
              setBusqueda("");
            }}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Código</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">NIT</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Nombre</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Valor cotizado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Presupuesto vigente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Costo real</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Disponible</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Ganancia estimada</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Viabilidad</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(({ pre, f, control, proyecto, cliente, nit }) => (
              <tr key={pre.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/gestion/presupuestos/${pre.id}`} className="font-medium text-emerald-700 hover:underline">
                    {pre.codigo || "—"}
                  </Link>
                </td>
                <td className="px-3 py-2">{proyecto}</td>
                <td className="px-3 py-2">{cliente}</td>
                <td className="px-3 py-2 text-neutral-500">{nit}</td>
                <td className="px-3 py-2">{pre.nombre}</td>
                <td className="px-3 py-2 text-right">{money.format(f.valorCotizado)}</td>
                <td className="px-3 py-2 text-right">{money.format(control.plan)}</td>
                <td className="px-3 py-2 text-right">{money.format(control.real)}</td>
                <td className={`px-3 py-2 text-right ${control.disponible < 0 ? "text-red-600" : ""}`}>{money.format(control.disponible)}</td>
                <td className={`px-3 py-2 text-right font-medium ${control.gananciaEst < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {money.format(control.gananciaEst)}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.viable ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {f.viable ? "✅ Viable" : "❌ No viable"}
                  </span>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-neutral-400">
                  {filas.length === 0 ? "No hay presupuestos registrados." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form action={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">Nuevo presupuesto</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Proyecto</span>
                <select name="proyecto_id" required className="in">
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
                <span className="mb-1 block text-neutral-600">Código</span>
                <input name="codigo" placeholder="PRE-001" className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Nombre</span>
                <input name="nombre" required className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Costo directo estimado</span>
                <input type="number" step="0.01" name="costos" defaultValue={0} className="in" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-neutral-600">Valor cotizado al cliente</span>
                <input type="number" step="0.01" name="valor_cotizado" defaultValue={0} className="in" />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                Crear y continuar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

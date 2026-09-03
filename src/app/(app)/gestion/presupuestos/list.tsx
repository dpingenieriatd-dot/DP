"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Info, FilterX } from "lucide-react";
import { eliminarPresupuesto } from "./actions";
import { money, type calcularPresupuesto, type calcularControlCostos } from "@/lib/finance";

type Fila = {
  pre: { id: string; codigo: string | null; nombre: string };
  f: ReturnType<typeof calcularPresupuesto>;
  control: ReturnType<typeof calcularControlCostos>;
  proyectoCodigo: string;
  proyectoNombre: string;
  proyectoEstado: string;
  cotizacionCodigo: string;
  cliente: string;
  nit: string;
};

const COLUMNAS = [
  { key: "codigo", label: "Cód. presupuesto" },
  { key: "proyecto", label: "Proyecto" },
  { key: "cotizacion", label: "Cotización base" },
  { key: "cliente", label: "Cliente" },
  { key: "nit", label: "NIT" },
  { key: "nombre", label: "Nombre" },
];

function ejecucionDe(control: ReturnType<typeof calcularControlCostos>) {
  if (control.plan > 0 && control.real > control.plan) return "Excedido";
  if (control.real > 0) return `${Math.round((control.real / control.plan) * 100)}% ejecutado`;
  return "Sin ejecutar";
}

export function PresupuestosList({ filas }: { filas: Fila[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [columnaFiltro, setColumnaFiltro] = useState("");
  const [valorFiltro, setValorFiltro] = useState("");

  const valorColumna = (fila: Fila, key: string) => {
    if (key === "codigo") return fila.pre.codigo ?? "";
    if (key === "proyecto") return fila.proyectoNombre;
    if (key === "cotizacion") return fila.cotizacionCodigo;
    if (key === "cliente") return fila.cliente;
    if (key === "nit") return fila.nit;
    if (key === "nombre") return fila.pre.nombre;
    return "";
  };

  const visibles = filas
    .filter(
      ({ pre, proyectoNombre, cliente, nit }) =>
        !busqueda || `${pre.codigo ?? ""} ${pre.nombre} ${proyectoNombre} ${cliente} ${nit}`.toLowerCase().includes(busqueda.toLowerCase())
    )
    .filter((fila) => !columnaFiltro || !valorFiltro || valorColumna(fila, columnaFiltro).toLowerCase().includes(valorFiltro.toLowerCase()));

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">Presupuestos</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{filas.length}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Panel principal · Control desde la cotización base aprobada</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proyecto, cotización, presupuesto..."
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button type="button" disabled title="Próximamente" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-400">
            Columnas / vistas
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={columnaFiltro} onChange={(e) => setColumnaFiltro(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Todas las columnas</option>
          {COLUMNAS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={valorFiltro}
          onChange={(e) => setValorFiltro(e.target.value)}
          placeholder="Valor a buscar"
          className="min-w-[200px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setColumnaFiltro("");
            setValorFiltro("");
            setBusqueda("");
          }}
          className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          <FilterX size={14} /> Limpiar filtro
        </button>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>El presupuesto nace de la cotización aprobada.</strong> Conserva proyecto, cotización base, cliente y NIT. Los ítems presupuestados se cargan desde la cotización y cualquier variación posterior de costos actualiza Proyectos e Inicio.
        </div>
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1360px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cód. presupuesto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cotización base</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">NIT</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Nombre</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Valor aprobado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Presupuesto base</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Costo real</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Disponible</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Ganancia estimada</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Utilidad vigente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Ejecución</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado del proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(({ pre, f, control, proyectoCodigo, proyectoEstado, cotizacionCodigo, cliente, nit }) => (
              <tr key={pre.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/gestion/presupuestos/${pre.id}`} className="font-medium text-emerald-700 hover:underline">
                    {pre.codigo || "—"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-neutral-500">{proyectoCodigo}</td>
                <td className="px-3 py-2 text-neutral-500">{cotizacionCodigo}</td>
                <td className="px-3 py-2">{cliente}</td>
                <td className="px-3 py-2 text-neutral-500">{nit}</td>
                <td className="px-3 py-2">{pre.nombre}</td>
                <td className="px-3 py-2 text-right">{money.format(f.valorCotizado)}</td>
                <td className="px-3 py-2 text-right">{money.format(control.plan)}</td>
                <td className="px-3 py-2 text-right">{money.format(control.real)}</td>
                <td className={`px-3 py-2 text-right ${control.disponible < 0 ? "text-red-600" : ""}`}>{money.format(control.disponible)}</td>
                <td className="px-3 py-2 text-right">{money.format(control.gananciaEst)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${control.gananciaActual < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {money.format(control.gananciaActual)}
                </td>
                <td className="px-3 py-2">{ejecucionDe(control)}</td>
                <td className="px-3 py-2 text-neutral-500">{proyectoEstado}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/gestion/presupuestos/${pre.id}`} className="text-xs font-medium text-emerald-700 hover:underline">
                      Alimentar costos
                    </Link>
                    {confirmingId === pre.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">¿Eliminar?</span>
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await eliminarPresupuesto(pre.id);
                              setConfirmingId(null);
                            })
                          }
                          disabled={pending}
                          className="font-semibold text-red-600 hover:underline"
                        >
                          Sí
                        </button>
                        <button onClick={() => setConfirmingId(null)} className="text-neutral-500 hover:underline">
                          No
                        </button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmingId(pre.id)} className="text-xs font-medium text-red-600 hover:underline">
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={15} className="px-3 py-8 text-center text-neutral-400">
                  {filas.length === 0 ? "No hay presupuestos registrados." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { eliminarCotizacion, aprobarYCrearProyecto } from "./actions";
import { money } from "@/lib/finance";

type Cotizacion = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  nombre: string;
  fecha: string | null;
  valor_cotizado: number;
  valor_sugerido: number | null;
  estado: string;
};

const ESTADO_CLASS: Record<string, string> = {
  Borrador: "bg-neutral-100 text-neutral-600",
  "Pendiente por definir": "bg-amber-100 text-amber-700",
  Enviada: "bg-sky-100 text-sky-700",
  Aprobada: "bg-emerald-100 text-emerald-700",
  Rechazada: "bg-red-100 text-red-700",
  Cancelada: "bg-red-100 text-red-700",
};

export function CotizacionesList({
  cotizaciones,
  clientes,
}: {
  cotizaciones: Cotizacion[];
  clientes: { id: string; nombre: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [porAprobar, setPorAprobar] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const clienteNombre = (id: string | null) => clientes.find((c) => c.id === id)?.nombre ?? "—";

  const visibles = cotizaciones
    .filter((c) => !estadoFiltro || c.estado === estadoFiltro)
    .filter((c) => !desde || (c.fecha && c.fecha >= desde))
    .filter((c) => !hasta || (c.fecha && c.fecha <= hasta))
    .filter((c) => !busqueda || `${c.codigo ?? ""} ${c.nombre} ${clienteNombre(c.cliente_id)}`.toLowerCase().includes(busqueda.toLowerCase()));
  const hayFiltros = !!(estadoFiltro || desde || hasta || busqueda);

  function aprobar(c: Cotizacion) {
    if (porAprobar !== c.id) {
      setPorAprobar(c.id);
      return;
    }
    startTransition(async () => {
      await aprobarYCrearProyecto(c.id);
    });
  }

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">Cotizaciones</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{cotizaciones.length}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Panel principal · Códigos únicos, margen individual y seguimiento por estado</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cotización, cliente..."
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <Link href="/gestion/cotizaciones/nueva" className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            + Nueva cotización
          </Link>
          <button type="button" disabled title="Próximamente" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-400">
            Columnas / vistas
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-neutral-600">
          Estado{" "}
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
            <option value="">Todos los estados</option>
            <option>Borrador</option>
            <option>Pendiente por definir</option>
            <option>Enviada</option>
            <option>Aprobada</option>
            <option>Rechazada</option>
            <option>Cancelada</option>
          </select>
        </label>
        <label className="text-sm text-neutral-600">
          Desde <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-sm text-neutral-600">
          Hasta <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
        </label>
        {hayFiltros && (
          <button
            onClick={() => {
              setEstadoFiltro("");
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

      <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>Control comercial de cotizaciones.</strong> El código no se puede repetir; la empresa atendida puede ser el mismo cliente; cada cotización conserva su propio margen de utilidad y puede clasificarse como Pendiente por definir, Enviada, Aprobada o Rechazada.
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Código</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Nombre</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Valor cotizado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Precio sugerido</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Viabilidad</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/gestion/cotizaciones/${c.id}`} className="font-medium text-emerald-700 hover:underline">
                    {c.codigo || "—"}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.nombre}</td>
                <td className="px-3 py-2">{clienteNombre(c.cliente_id)}</td>
                <td className="px-3 py-2 text-right">{money.format(c.valor_cotizado)}</td>
                <td className="px-3 py-2 text-right">{c.valor_sugerido != null ? money.format(c.valor_sugerido) : "—"}</td>
                <td className="px-3 py-2">
                  {c.valor_sugerido == null ? (
                    <span className="text-xs text-neutral-400">Sin costos estimados</span>
                  ) : c.valor_cotizado >= c.valor_sugerido ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Viable</span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">No viable</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_CLASS[c.estado]}`}>{c.estado}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {(c.estado === "Borrador" || c.estado === "Pendiente por definir" || c.estado === "Enviada") && (
                    <button onClick={() => aprobar(c)} disabled={pending} className="mr-3 text-xs font-semibold text-emerald-700 hover:underline">
                      {porAprobar === c.id ? "¿Confirmar? Aprobar y crear proyecto" : "Aprobar → crear proyecto"}
                    </button>
                  )}
                  <Link href={`/gestion/cotizaciones/${c.id}`} className="mr-2 text-xs font-medium text-emerald-700 hover:underline">
                    Editar
                  </Link>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await eliminarCotizacion(c.id);
                      })
                    }
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                  {cotizaciones.length === 0 ? "No hay cotizaciones registradas." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

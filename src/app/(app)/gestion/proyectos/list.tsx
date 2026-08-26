"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Link2, FilterX } from "lucide-react";
import { archivarProyecto } from "./actions";
import { money } from "@/lib/finance";

type Fila = {
  proy: { id: string; codigo: string | null; nombre: string; estado: string; fecha_inicio: string | null; fecha_fin: string | null };
  cliente: string;
  nitCliente: string;
  responsable: string;
  cotizacionCodigo: string;
  valorAprobado: number;
  costoVigente: number;
  gananciaTotal: number;
};

const COLUMNAS = [
  { key: "codigo", label: "Código proyecto" },
  { key: "cotizacion", label: "Cotización" },
  { key: "nombre", label: "Nombre actual" },
  { key: "cliente", label: "Cliente" },
  { key: "nit", label: "NIT cliente" },
  { key: "responsable", label: "Responsable" },
  { key: "estado", label: "Estado" },
];

export function ProyectosList({ filas }: { filas: Fila[] }) {
  const [pending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [columnaFiltro, setColumnaFiltro] = useState("");
  const [valorFiltro, setValorFiltro] = useState("");

  const valorColumna = (f: Fila, key: string) => {
    if (key === "codigo") return f.proy.codigo ?? "";
    if (key === "cotizacion") return f.cotizacionCodigo;
    if (key === "nombre") return f.proy.nombre;
    if (key === "cliente") return f.cliente;
    if (key === "nit") return f.nitCliente;
    if (key === "responsable") return f.responsable;
    if (key === "estado") return f.proy.estado;
    return "";
  };

  const visibles = filas
    .filter((f) => !busqueda || `${f.proy.codigo ?? ""} ${f.proy.nombre} ${f.cliente}`.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((f) => !columnaFiltro || !valorFiltro || valorColumna(f, columnaFiltro).toLowerCase().includes(valorFiltro.toLowerCase()));

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">Proyectos</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{filas.length}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Panel principal · Proyecto consecutivo, cotización origen y NIT del cliente</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar proyecto, cotización, cliente..."
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

      <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <Link2 size={16} className="mt-0.5 shrink-0" />
        <div>
          <strong>Los proyectos nacen de cotizaciones aprobadas.</strong> El código PROY_AAAA_### es único y ascendente; la cotización de origen y el NIT del cliente quedan vinculados al proyecto. Los costos y utilidad vienen del Presupuesto vigente.
        </div>
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1150px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Código proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cotización</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Nombre actual</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">NIT cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Responsable</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Mes inicio</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Mes cierre</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Valor aprobado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Costo vigente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Utilidad vigente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map(({ proy, cliente, nitCliente, responsable, cotizacionCodigo, valorAprobado, costoVigente, gananciaTotal }) => (
              <tr key={proy.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/gestion/proyectos/${proy.id}`} className="font-medium text-emerald-700 hover:underline">
                    {proy.codigo || "(sin código)"}
                  </Link>
                </td>
                <td className="px-3 py-2 text-neutral-500">{cotizacionCodigo}</td>
                <td className="px-3 py-2">{proy.nombre}</td>
                <td className="px-3 py-2">{cliente}</td>
                <td className="px-3 py-2 text-neutral-500">{nitCliente}</td>
                <td className="px-3 py-2">{responsable}</td>
                <td className="px-3 py-2">{proy.estado}</td>
                <td className="px-3 py-2 text-neutral-500">{proy.fecha_inicio ? proy.fecha_inicio.slice(0, 7) : "—"}</td>
                <td className="px-3 py-2 text-neutral-500">{proy.fecha_fin ? proy.fecha_fin.slice(0, 7) : "—"}</td>
                <td className="px-3 py-2 text-right">{money.format(valorAprobado)}</td>
                <td className="px-3 py-2 text-right font-semibold">{money.format(costoVigente)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${gananciaTotal < 0 ? "text-red-600" : ""}`}>{money.format(gananciaTotal)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/gestion/proyectos/${proy.id}`} className="text-xs font-medium text-emerald-700 hover:underline">
                      Abrir / Editar
                    </Link>
                    {confirmingId === proy.id ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">¿Archivar?</span>
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await archivarProyecto(proy.id);
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
                      <button onClick={() => setConfirmingId(proy.id)} className="text-xs font-medium text-red-600 hover:underline">
                        Archivar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-neutral-400">
                  {filas.length === 0 ? "No hay proyectos registrados." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

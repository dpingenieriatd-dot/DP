"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Paperclip, FilterX } from "lucide-react";
import { eliminarCotizacion, aprobarYCrearProyecto } from "./actions";
import { money } from "@/lib/finance";

type Cotizacion = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  empresa_id: string | null;
  responsable_id: string | null;
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

const COLUMNAS = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre" },
  { key: "cliente", label: "Cliente" },
  { key: "empresa", label: "Empresa atendida" },
  { key: "responsable", label: "Responsable" },
  { key: "fecha", label: "Fecha" },
  { key: "estado", label: "Estado" },
];

export function CotizacionesList({
  cotizaciones,
  clientes,
  empresas,
  profiles,
  proyectos,
  presupuestos,
  soportes,
}: {
  cotizaciones: Cotizacion[];
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  proyectos: { codigo: string | null; cotizacion_id: string }[];
  presupuestos: { codigo: string | null; cotizacion_id: string }[];
  soportes: { cotizacion_id: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [porAprobar, setPorAprobar] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [columnaFiltro, setColumnaFiltro] = useState("");
  const [valorFiltro, setValorFiltro] = useState("");

  const clienteNombre = (id: string | null) => clientes.find((c) => c.id === id)?.nombre ?? "—";
  const empresaNombre = (id: string | null) => empresas.find((e) => e.id === id)?.nombre ?? "—";
  const responsableNombre = (id: string | null) => {
    const p = profiles.find((p) => p.id === id);
    return p ? p.full_name || p.email || "—" : "—";
  };
  const proyectoDe = (id: string) => proyectos.find((p) => p.cotizacion_id === id)?.codigo ?? null;
  const presupuestoDe = (id: string) => presupuestos.find((p) => p.cotizacion_id === id)?.codigo ?? null;
  const soportesDe = (id: string) => soportes.filter((s) => s.cotizacion_id === id).length;

  const valorColumna = (c: Cotizacion, key: string) => {
    if (key === "codigo") return c.codigo ?? "";
    if (key === "nombre") return c.nombre;
    if (key === "cliente") return clienteNombre(c.cliente_id);
    if (key === "empresa") return empresaNombre(c.empresa_id);
    if (key === "responsable") return responsableNombre(c.responsable_id);
    if (key === "fecha") return c.fecha ?? "";
    if (key === "estado") return c.estado;
    return "";
  };

  const visibles = cotizaciones
    .filter(
      (c) =>
        !busqueda ||
        `${c.codigo ?? ""} ${c.nombre} ${clienteNombre(c.cliente_id)}`.toLowerCase().includes(busqueda.toLowerCase())
    )
    .filter((c) => !columnaFiltro || !valorFiltro || valorColumna(c, columnaFiltro).toLowerCase().includes(valorFiltro.toLowerCase()));

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

      <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
        <strong>Control comercial de cotizaciones.</strong> El código no se puede repetir; Empresa atendida puede ser el mismo Cliente; cada cotización conserva su propio margen de utilidad y puede clasificarse como Pendiente por definir, Enviada, Aprobada o Rechazada.
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Código</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Nombre</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Empresa atendida</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Responsable</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Fecha</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado / vínculo</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Valor cotizado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Valor sugerido</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Soportes</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => {
              const proyecto = proyectoDe(c.id);
              const presupuesto = presupuestoDe(c.id);
              const nSoportes = soportesDe(c.id);
              return (
                <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <Link href={`/gestion/cotizaciones/${c.id}`} className="font-medium text-emerald-700 hover:underline">
                      {c.codigo || "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{c.nombre}</td>
                  <td className="px-3 py-2">{clienteNombre(c.cliente_id)}</td>
                  <td className="px-3 py-2">{empresaNombre(c.empresa_id)}</td>
                  <td className="px-3 py-2">{responsableNombre(c.responsable_id)}</td>
                  <td className="px-3 py-2">{c.fecha || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_CLASS[c.estado]}`}>{c.estado}</span>
                    {proyecto && (
                      <div className="mt-1 text-xs text-neutral-400">
                        {proyecto}
                        {presupuesto ? ` · ${presupuesto}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{money.format(c.valor_cotizado)}</td>
                  <td className="px-3 py-2 text-right">{c.valor_sugerido != null ? money.format(c.valor_sugerido) : "—"}</td>
                  <td className="px-3 py-2">
                    {nSoportes ? (
                      <Link href={`/gestion/cotizaciones/${c.id}`} className="flex w-fit items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100">
                        <Paperclip size={12} /> {nSoportes} soporte{nSoportes === 1 ? "" : "s"}
                      </Link>
                    ) : (
                      <span className="text-xs text-neutral-400">Sin soportes</span>
                    )}
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
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-neutral-400">
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

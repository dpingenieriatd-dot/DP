"use client";

import { useState, useTransition } from "react";
import { crearCompra, actualizarCompra, archivarCompra } from "./actions";
import { KpiCard } from "@/components/kpi-card";
import { money } from "@/lib/finance";

type Compra = {
  id: string;
  codigo: string | null;
  proyecto_id: string | null;
  proveedor_id: string | null;
  insumo_id: string | null;
  fecha: string;
  unidad: string | null;
  cantidad: number;
  valor_unitario: number;
  valor_pagado: number;
  estado_pago: string;
  referencia: string | null;
  categoria: string | null;
  notas: string | null;
};

const CATEGORIAS = ["Servicios profesionales", "Materiales e insumos", "Transporte y logística", "Alimentación", "Publicidad y diseño", "Otros"];
const COLUMNAS_FILTRO = ["Código", "Proyecto", "Cliente", "Proveedor", "Descripción", "Estado"];

export function ComprasList({
  compras,
  proyectos,
  proveedores,
  insumos,
  clientes,
}: {
  compras: Compra[];
  proyectos: { id: string; codigo: string | null; nombre: string; cliente_id: string | null }[];
  proveedores: { id: string; nombre: string }[];
  insumos: { id: string; descripcion: string; unidad: string | null; costo: number }[];
  clientes: { id: string; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Compra | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [columnaFiltro, setColumnaFiltro] = useState("");
  const [valorFiltro, setValorFiltro] = useState("");

  const proyectosOrdenados = [...proyectos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const proyectoDe = (id: string | null) => proyectos.find((p) => p.id === id) ?? null;
  const proyectoNombre = (id: string | null) => {
    const p = proyectoDe(id);
    return p ? `${p.codigo ? p.codigo + " · " : ""}${p.nombre}` : "—";
  };
  const clienteNombre = (proyectoId: string | null) => {
    const p = proyectoDe(proyectoId);
    const cliente = p?.cliente_id ? clientes.find((c) => c.id === p.cliente_id) : null;
    return cliente?.nombre ?? "—";
  };
  const proveedorNombre = (id: string | null) => proveedores.find((p) => p.id === id)?.nombre ?? "—";
  const descripcionCompra = (c: Compra) => {
    const insumo = c.insumo_id ? insumos.find((i) => i.id === c.insumo_id)?.descripcion : null;
    return insumo || c.categoria || c.notas || "—";
  };

  function valorColumna(c: Compra, columna: string) {
    switch (columna) {
      case "Código":
        return c.codigo ?? "";
      case "Proyecto":
        return proyectoNombre(c.proyecto_id);
      case "Cliente":
        return clienteNombre(c.proyecto_id);
      case "Proveedor":
        return proveedorNombre(c.proveedor_id);
      case "Descripción":
        return descripcionCompra(c);
      case "Estado":
        return c.estado_pago;
      default:
        return "";
    }
  }

  const visibles = compras
    .filter((c) => !proyectoFiltro || c.proyecto_id === proyectoFiltro)
    .filter((c) => !desde || c.fecha >= desde)
    .filter((c) => !hasta || c.fecha <= hasta)
    .filter((c) => !busqueda || `${c.codigo ?? ""} ${proyectoNombre(c.proyecto_id)} ${proveedorNombre(c.proveedor_id)}`.toLowerCase().includes(busqueda.toLowerCase()))
    .filter((c) => !columnaFiltro || !valorFiltro || valorColumna(c, columnaFiltro).toLowerCase().includes(valorFiltro.toLowerCase()));
  const hayFiltrosCentro = !!(proyectoFiltro || desde || hasta);

  const totalAcumulado = compras.reduce((s, c) => s + c.cantidad * c.valor_unitario, 0);
  const totalFiltrado = visibles.reduce((s, c) => s + c.cantidad * c.valor_unitario, 0);

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = editing ? await actualizarCompra(editing.id, formData) : await crearCompra(formData);
      if (r?.error) setError(r.error);
      else {
        setOpen(false);
        setEditing(null);
      }
    });
  }

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">Compras</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{compras.length}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Panel principal · Cada compra se asigna a un proyecto / centro de costos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar compra, proyecto, proveedor..."
            className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            + Nueva compra
          </button>
          <button type="button" disabled title="Próximamente" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-400">
            Columnas / vistas
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={columnaFiltro}
          onChange={(e) => setColumnaFiltro(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las columnas</option>
          {COLUMNAS_FILTRO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={valorFiltro}
          onChange={(e) => setValorFiltro(e.target.value)}
          placeholder="Escribe el dato que quieres filtrar"
          className="min-w-[240px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setColumnaFiltro("");
            setValorFiltro("");
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          Limpiar filtro
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total acumulado de compras" value={money.format(totalAcumulado)} subtitle="Todas las compras registradas" color="emerald" />
        <KpiCard label="Compras visibles" value={visibles.length} subtitle="Total general" color="emerald" />
        <KpiCard label="Total filtrado" value={money.format(totalFiltrado)} subtitle="Sin filtros" color="emerald" />
      </div>

      <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-emerald-900">🏢 Centro de costos y período</div>
            <p className="text-xs text-neutral-500">Filtra las compras por proyecto y/o por fechas.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm text-neutral-600">
            <span className="mb-1 block">Proyecto / centro de costos</span>
            <select value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
              <option value="">Todos los proyectos</option>
              {proyectosOrdenados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} · ` : ""}
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-neutral-600">
            <span className="mb-1 block">Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-sm text-neutral-600">
            <span className="mb-1 block">Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
          </label>
          {hayFiltrosCentro && (
            <button
              onClick={() => {
                setProyectoFiltro("");
                setDesde("");
                setHasta("");
              }}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              ↻ Limpiar
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1250px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Código</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proyecto / centro de costos</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Fecha</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proveedor</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Descripción</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Cant.</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">V. unit.</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2 text-right">Total</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2 font-medium text-emerald-700">{c.codigo || "—"}</td>
                <td className="px-3 py-2">{proyectoNombre(c.proyecto_id)}</td>
                <td className="px-3 py-2">{clienteNombre(c.proyecto_id)}</td>
                <td className="px-3 py-2">{c.fecha}</td>
                <td className="px-3 py-2">{proveedorNombre(c.proveedor_id)}</td>
                <td className="px-3 py-2">{descripcionCompra(c)}</td>
                <td className="px-3 py-2 text-right">{c.cantidad}</td>
                <td className="px-3 py-2 text-right">{money.format(c.valor_unitario)}</td>
                <td className="px-3 py-2 text-right font-medium">{money.format(c.cantidad * c.valor_unitario)}</td>
                <td className="px-3 py-2">{c.estado_pago}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {confirmingId === c.id ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="text-neutral-500">¿Archivar?</span>
                      <button onClick={() => startTransition(async () => { await archivarCompra(c.id); setConfirmingId(null); })} className="font-semibold text-red-600 hover:underline">
                        Sí
                      </button>
                      <button onClick={() => setConfirmingId(null)} className="text-neutral-500 hover:underline">
                        No
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                        className="mr-2 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Editar
                      </button>
                      <button onClick={() => setConfirmingId(c.id)} className="text-xs font-medium text-red-600 hover:underline">
                        Archivar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-neutral-400">
                  {compras.length === 0 ? "Aún no hay compras registradas." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form action={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">{editing ? "Editar" : "Nueva"} compra</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo label="Proyecto">
                <select name="proyecto_id" defaultValue={editing?.proyecto_id ?? ""} required className="in">
                  <option value="">Seleccione…</option>
                  {proyectos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo ? `${p.codigo} · ` : ""}
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Proveedor">
                <select name="proveedor_id" defaultValue={editing?.proveedor_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Insumo / servicio">
                <select name="insumo_id" defaultValue={editing?.insumo_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.descripcion}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Fecha">
                <input type="date" name="fecha" defaultValue={editing?.fecha ?? new Date().toISOString().slice(0, 10)} required className="in" />
              </Campo>
              <Campo label="Unidad">
                <input name="unidad" defaultValue={editing?.unidad ?? ""} className="in" />
              </Campo>
              <Campo label="Cantidad">
                <input type="number" step="0.01" name="cantidad" defaultValue={editing?.cantidad ?? 1} required className="in" />
              </Campo>
              <Campo label="Valor unitario">
                <input type="number" step="0.01" name="valor_unitario" defaultValue={editing?.valor_unitario ?? ""} required className="in" />
              </Campo>
              <Campo label="Estado del pago">
                <select name="estado_pago" defaultValue={editing?.estado_pago ?? "Cotizado"} className="in">
                  <option>Cotizado</option>
                  <option>Aprobado</option>
                  <option>Pagado</option>
                  <option>Pendiente</option>
                  <option>Rechazado</option>
                </select>
              </Campo>
              <Campo label="Valor pagado">
                <input type="number" step="0.01" name="valor_pagado" defaultValue={editing?.valor_pagado ?? 0} className="in" />
              </Campo>
              <Campo label="Factura / soporte">
                <input name="referencia" defaultValue={editing?.referencia ?? ""} className="in" />
              </Campo>
              <Campo label="Categoría">
                <select name="categoria" defaultValue={editing?.categoria ?? CATEGORIAS[0]} className="in">
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Observaciones" full>
                <textarea name="notas" defaultValue={editing?.notas ?? ""} className="in" />
              </Campo>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
                className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
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

function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "col-span-3" : ""}`}>
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

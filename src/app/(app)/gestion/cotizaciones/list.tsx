"use client";

import { useMemo, useState, useTransition } from "react";
import { crearCotizacion, actualizarCotizacion, eliminarCotizacion, aprobarYCrearProyecto } from "./actions";
import { subirSoporte, eliminarSoporte } from "./soportes-actions";
import { calcularCotizacion, calcularPresupuesto, money } from "@/lib/finance";

type Cotizacion = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  empresa_id: string | null;
  nombre: string;
  responsable_id: string | null;
  fecha: string | null;
  personas: number | null;
  valor_unit: number | null;
  val_materiales: number | null;
  horas: number | null;
  valor_hora: number | null;
  valor_prof: number | null;
  valor_cotizado: number;
  valor_sugerido: number | null;
  costos_estimados: number | null;
  resp_iva: boolean | null;
  margen_pct: number | null;
  admin_pct: number | null;
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

type Soporte = { id: string; cotizacion_id: string; nombre_archivo: string; storage_path: string; url: string | null };

export function CotizacionesList({
  cotizaciones,
  clientes,
  empresas,
  profiles,
  soportes,
}: {
  cotizaciones: Cotizacion[];
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string; cliente_id: string | null }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  soportes: Soporte[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [porAprobar, setPorAprobar] = useState<string | null>(null);
  const [errorSoporte, setErrorSoporte] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const visibles = cotizaciones
    .filter((c) => !estadoFiltro || c.estado === estadoFiltro)
    .filter((c) => !desde || (c.fecha && c.fecha >= desde))
    .filter((c) => !hasta || (c.fecha && c.fecha <= hasta));
  const hayFiltros = !!(estadoFiltro || desde || hasta);

  const [preview, setPreview] = useState({
    personas: editing?.personas ?? 0,
    valor_unit: editing?.valor_unit ?? 0,
    horas: editing?.horas ?? 0,
    valor_hora: editing?.valor_hora ?? 0,
    costos: editing?.costos_estimados ?? 0,
    respIva: editing?.resp_iva ?? true,
    margenPct: editing?.margen_pct ?? 30,
    adminPct: editing?.admin_pct ?? 15,
  });
  const calc = useMemo(() => calcularCotizacion(preview), [preview]);
  const rentabilidad = useMemo(
    () =>
      calcularPresupuesto({
        costos: preview.costos,
        admin_pct: preview.adminPct,
        margen_pct: preview.margenPct,
        resp_iva: preview.respIva,
        iva_pct: 19,
        valor_cotizado: calc.valorCotizado,
      }),
    [preview.costos, preview.respIva, preview.margenPct, preview.adminPct, calc.valorCotizado]
  );

  const clienteNombre = (id: string | null) => clientes.find((c) => c.id === id)?.nombre ?? "—";

  function abrirCrear() {
    setEditing(null);
    setPreview({ personas: 0, valor_unit: 0, horas: 0, valor_hora: 0, costos: 0, respIva: true, margenPct: 30, adminPct: 15 });
    setError(null);
    setErrorSoporte(null);
    setOpen(true);
  }

  function abrirEditar(c: Cotizacion) {
    setEditing(c);
    setPreview({
      personas: c.personas ?? 0,
      valor_unit: c.valor_unit ?? 0,
      horas: c.horas ?? 0,
      valor_hora: c.valor_hora ?? 0,
      costos: c.costos_estimados ?? 0,
      respIva: c.resp_iva ?? true,
      margenPct: c.margen_pct ?? 30,
      adminPct: c.admin_pct ?? 15,
    });
    setError(null);
    setErrorSoporte(null);
    setOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = editing ? await actualizarCotizacion(editing.id, formData) : await crearCotizacion(formData);
      if (r?.error) setError(r.error);
      else {
        setOpen(false);
        setEditing(null);
      }
    });
  }

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-emerald-900">Cotizaciones</h1>
        <button onClick={abrirCrear} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          + Nueva cotización
        </button>
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
            }}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Limpiar filtros
          </button>
        )}
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
                <td className="px-3 py-2">{c.codigo || "—"}</td>
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
                  <button onClick={() => abrirEditar(c)} className="mr-2 text-xs font-medium text-emerald-700 hover:underline">
                    Editar
                  </button>
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

      {open && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 overflow-auto bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form action={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">{editing ? "Editar" : "Nueva"} cotización</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo label="Código">
                <input name="codigo" placeholder="COT-001" defaultValue={editing?.codigo ?? ""} className="in" />
              </Campo>
              <Campo label="Nombre" full2>
                <input name="nombre" required defaultValue={editing?.nombre ?? ""} className="in" />
              </Campo>
              <Campo label="Cliente">
                <select name="cliente_id" defaultValue={editing?.cliente_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Empresa atendida">
                <select name="empresa_id" defaultValue={editing?.empresa_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  <optgroup label="Empresas atendidas">
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Usar el cliente directamente (sin empresa intermedia)">
                    {clientes.map((c) => (
                      <option key={`cliente:${c.id}`} value={`cliente:${c.id}`}>
                        {c.nombre}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Campo>
              <Campo label="Responsable comercial">
                <select name="responsable_id" defaultValue={editing?.responsable_id ?? ""} className="in">
                  <option value="">Seleccione…</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Fecha">
                <input type="date" name="fecha" defaultValue={editing?.fecha ?? new Date().toISOString().slice(0, 10)} className="in" />
              </Campo>
              {editing && (
                <Campo label="Estado">
                  <select name="estado" defaultValue={editing.estado} className="in">
                    <option>Borrador</option>
                    <option>Pendiente por definir</option>
                    <option>Enviada</option>
                    <option>Aprobada</option>
                    <option>Rechazada</option>
                    <option>Cancelada</option>
                  </select>
                </Campo>
              )}

              <Campo label="Número de personas">
                <input
                  type="number"
                  step="1"
                  name="personas"
                  value={preview.personas}
                  onChange={(e) => setPreview((p) => ({ ...p, personas: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="Valor por persona (materiales)">
                <input
                  type="number"
                  step="0.01"
                  name="valor_unit"
                  value={preview.valor_unit}
                  onChange={(e) => setPreview((p) => ({ ...p, valor_unit: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="Valor materiales (calculado)">
                <input value={money.format(calc.valMateriales)} readOnly className="in bg-neutral-50" />
              </Campo>
              <Campo label="Horas profesional">
                <input
                  type="number"
                  step="0.5"
                  name="horas"
                  value={preview.horas}
                  onChange={(e) => setPreview((p) => ({ ...p, horas: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="Valor por hora">
                <input
                  type="number"
                  step="0.01"
                  name="valor_hora"
                  value={preview.valor_hora}
                  onChange={(e) => setPreview((p) => ({ ...p, valor_hora: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="Valor profesional (calculado)">
                <input value={money.format(calc.valorProf)} readOnly className="in bg-neutral-50" />
              </Campo>
              <Campo label="Costos estimados (internos)">
                <input
                  type="number"
                  step="0.01"
                  name="costos_estimados"
                  value={preview.costos}
                  onChange={(e) => setPreview((p) => ({ ...p, costos: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="Costos administrativos (%)">
                <input
                  type="number"
                  step="1"
                  min="0"
                  name="admin_pct"
                  value={preview.adminPct}
                  onChange={(e) => setPreview((p) => ({ ...p, adminPct: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="Margen de utilidad (%)">
                <input
                  type="number"
                  step="1"
                  min="0"
                  name="margen_pct"
                  value={preview.margenPct}
                  onChange={(e) => setPreview((p) => ({ ...p, margenPct: Number(e.target.value) }))}
                  className="in"
                />
              </Campo>
              <Campo label="¿Responde por IVA?">
                <select
                  name="resp_iva"
                  value={preview.respIva ? "true" : "false"}
                  onChange={(e) => setPreview((p) => ({ ...p, respIva: e.target.value === "true" }))}
                  className="in"
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Campo>
            </div>

            <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm">
              <div className="flex justify-between font-semibold text-emerald-900">
                <span>Valor cotizado (lo que se le cobra al cliente)</span>
                <span>{money.format(calc.valorCotizado)}</span>
              </div>
              {preview.costos <= 0 ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  ⚠ Sin costos estimados aún — el precio sugerido {editing?.valor_sugerido != null ? "migrado (histórico)" : ""} se
                  mantiene hasta que cargues costos.
                </p>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-900 sm:grid-cols-3">
                    <span>Costos admin. ({preview.adminPct}%): {money.format(rentabilidad.admin)}</span>
                    <span>Utilidad esperada ({preview.margenPct}%): {money.format(rentabilidad.utilidadEsperada)}</span>
                    <span>IVA: {money.format(rentabilidad.iva)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-emerald-200 pt-2 font-semibold text-emerald-900">
                    <span>Precio mínimo recomendado</span>
                    <span>{money.format(rentabilidad.valorSugerido)}</span>
                  </div>
                  <p className={`mt-1 text-xs font-semibold ${rentabilidad.viable ? "text-emerald-700" : "text-red-600"}`}>
                    {rentabilidad.viable
                      ? "✓ Viable: el valor cotizado cubre costos, margen e IVA."
                      : `✗ No viable: falta ${money.format(-rentabilidad.margenNeg)} para cubrir costos, margen e IVA.`}
                  </p>
                </>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                Cancelar
              </button>
              <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                Guardar
              </button>
            </div>
          </form>

          {editing && (
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-2 text-sm font-semibold text-emerald-900">Soportes de la cotización</h3>
              <ul className="mb-3 space-y-1 text-sm">
                {soportes
                  .filter((s) => s.cotizacion_id === editing.id)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5">
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                          {s.nombre_archivo}
                        </a>
                      ) : (
                        <span>{s.nombre_archivo}</span>
                      )}
                      <button
                        onClick={() => startTransition(async () => { await eliminarSoporte(s.id, s.storage_path); })}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                {soportes.filter((s) => s.cotizacion_id === editing.id).length === 0 && (
                  <li className="text-neutral-400">Sin soportes adjuntos.</li>
                )}
              </ul>
              <form
                action={(fd) => {
                  const cotId = editing.id;
                  startTransition(async () => {
                    const r = await subirSoporte(cotId, fd);
                    if (r?.error) setErrorSoporte(r.error);
                    else setErrorSoporte(null);
                  });
                }}
                className="flex items-center gap-2"
              >
                <input type="file" name="archivo" required className="text-sm" />
                <button type="submit" disabled={pending} className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-60">
                  Subir
                </button>
              </form>
              {errorSoporte && <p className="mt-2 text-sm text-red-600">{errorSoporte}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Campo({ label, children, full2 }: { label: string; children: React.ReactNode; full2?: boolean }) {
  return (
    <label className={`block text-sm ${full2 ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

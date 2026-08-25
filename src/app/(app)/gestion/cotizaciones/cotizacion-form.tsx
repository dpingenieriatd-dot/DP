"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearCotizacion, actualizarCotizacion } from "./actions";
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

type Soporte = { id: string; cotizacion_id: string; nombre_archivo: string; storage_path: string; url: string | null };

export function CotizacionForm({
  editing,
  clientes,
  empresas,
  profiles,
  soportes,
}: {
  editing: Cotizacion | null;
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string; cliente_id: string | null }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  soportes: Soporte[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorSoporte, setErrorSoporte] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = editing ? await actualizarCotizacion(editing.id, formData) : await crearCotizacion(formData);
      if (r?.error) setError(r.error);
      else router.push("/gestion/cotizaciones");
    });
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-900">{editing ? "Editar cotización" : "Nueva cotización"}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cotizaciones · <span className="font-medium text-neutral-700">{editing?.codigo || "Código pendiente"}</span> ·{" "}
            <span className="font-medium text-neutral-700">{editing?.estado ?? "Borrador"}</span>
          </p>
        </div>
        <Link href="/gestion/cotizaciones" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          ← Volver
        </Link>
      </div>

      <form action={submit} className="max-w-4xl">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Datos generales</h2>
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
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Cálculo de la cotización</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm">
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
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Link href="/gestion/cotizaciones" className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </Link>
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>

      {editing && (
        <div className="mt-4 max-w-4xl rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Soportes de la cotización</h2>
          <ul className="mb-3 space-y-1 text-sm">
            {soportes.map((s) => (
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
            {soportes.length === 0 && <li className="text-neutral-400">Sin soportes adjuntos.</li>}
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

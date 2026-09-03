"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { actualizarProyecto } from "./actions";
import { money, type calcularPresupuesto, type calcularControlCostos } from "@/lib/finance";
import { useGuardado } from "@/lib/use-guardado";

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
type PresupuestoCalc = { pre: { id: string; codigo: string | null; nombre: string }; f: ReturnType<typeof calcularPresupuesto>; control: ReturnType<typeof calcularControlCostos> };

export function ProyectoDetalle({
  proyecto,
  cotizacion,
  clientes,
  empresas,
  profiles,
  presupuestos,
}: {
  proyecto: Proyecto;
  cotizacion: { codigo: string | null; fecha_aprobacion: string | null; medio_aprobacion: string | null } | null;
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  presupuestos: PresupuestoCalc[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { guardado, marcarGuardado } = useGuardado();

  function guardar(formData: FormData) {
    startTransition(async () => {
      const r = await actualizarProyecto(proyecto.id, formData);
      if (r?.error) setError(r.error);
      else {
        setError(null);
        marcarGuardado();
      }
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
        <div className="space-y-6">
        <form action={guardar} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">Datos del proyecto</h2>
          {cotizacion && (cotizacion.fecha_aprobacion || cotizacion.codigo) && (
            <p className="rounded-md bg-neutral-50 p-2.5 text-xs text-neutral-600">
              Nace de la cotización <strong>{cotizacion.codigo ?? "—"}</strong>
              {cotizacion.fecha_aprobacion ? `, aprobada por el cliente el ${fmtFecha(cotizacion.fecha_aprobacion)}` : ""}
              {cotizacion.medio_aprobacion ? ` (${cotizacion.medio_aprobacion})` : ""}.
            </p>
          )}
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
                <option>Planeado</option>
                <option>En ejecución</option>
                <option>Suspendido</option>
                <option>Finalizado</option>
                <option>Cancelado</option>
                {/* Lo pone el flujo "Rechazar" de Cotizaciones; se incluye para que
                    guardar el proyecto no lo pise silenciosamente con "Planeado". */}
                <option>Rechazado</option>
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
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
              Guardar cambios
            </button>
            {guardado && <span className="text-sm font-medium text-emerald-700">✓ Cambios guardados</span>}
          </div>
        </form>

        <p className="text-xs text-neutral-400">
          El valor del contrato, el IVA y las retenciones (efectivo neto esperado) se ven y se ajustan en la{" "}
          <Link href="/gestion/cotizaciones" className="font-semibold text-emerald-700 hover:underline">cotización</Link>{" "}
          de la que nació este proyecto.
        </p>
        </div>

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
              <p className="mt-2 text-xs text-neutral-400">
                Las compras del proyecto y el costo real ejecutado se gestionan desde{" "}
                <Link href="/gestion/compras" className="font-semibold text-emerald-700 hover:underline">Compras</Link> y se
                reflejan en el control de cada presupuesto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtFecha(v: string) {
  return new Date(v + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}


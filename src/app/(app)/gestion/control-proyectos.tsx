"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, Download, TrendingUp } from "lucide-react";
import { money, type EstadoPlata, type EstadoTiempo } from "@/lib/finance";
import { etiquetaPlata, etiquetaTiempo, resumenControl, type FilaControl } from "@/lib/control-proyectos";

export type { FilaControl };

const PLATA_CLS: Record<EstadoPlata, string> = {
  sano: "bg-emerald-100 text-emerald-800",
  riesgo: "bg-amber-100 text-amber-800",
  critico: "bg-red-100 text-red-700",
};

const TIEMPO_CLS: Record<EstadoTiempo, string> = {
  a_tiempo: "bg-emerald-100 text-emerald-800",
  por_vencer: "bg-amber-100 text-amber-800",
  atrasado: "bg-red-100 text-red-700",
  cerrado: "bg-neutral-200 text-neutral-600",
  sin_fecha: "bg-neutral-100 text-neutral-500",
};

export function ControlProyectos({ rows }: { rows: FilaControl[] }) {
  const [clienteFiltro, setClienteFiltro] = useState("");

  const clientes = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.clienteId && m.set(r.clienteId, r.cliente));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visibles = clienteFiltro ? rows.filter((r) => r.clienteId === clienteFiltro) : rows;
  const t = useMemo(() => resumenControl(visibles), [visibles]);
  const pdfHref = `/api/gestion/control-proyectos/pdf${clienteFiltro ? `?cliente=${clienteFiltro}` : ""}`;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-lg font-semibold text-emerald-900">
            <TrendingUp size={18} /> Control de proyectos
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Cada proyecto con su presupuesto, lo gastado en compras y si va a tiempo. Se calcula solo desde la cotización aprobada, el presupuesto y las compras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {clientes.length > 1 && (
            <select
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
            >
              <option value="">Todos los clientes</option>
              {clientes.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          )}
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <Download size={14} /> PDF
          </a>
        </div>
      </div>

      {t.sinFecha > 0 && (
        <p className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <CalendarClock size={14} className="shrink-0" />
          <span>
            {t.sinFecha} {t.sinFecha === 1 ? "proyecto en curso no tiene" : "proyectos en curso no tienen"} fecha de entrega — el semáforo de
            tiempo no puede evaluarlos. Ábrelos desde la tabla y complétala en &quot;Datos del proyecto&quot;.
          </span>
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tot label="Proyectos activos" valor={String(t.activos)} />
        <Tot label="En atención / sobre presup." valor={String(t.enRiesgo)} alerta={t.enRiesgo > 0} icon={<AlertTriangle size={13} />} />
        <Tot label="Atrasados" valor={String(t.atrasados)} alerta={t.atrasados > 0} icon={<CalendarClock size={13} />} />
        <Tot label="Comprometido en compras" valor={money.format(t.comprometido)} />
        <Tot label="Ganancia proyectada" valor={money.format(t.gananciaProyectada)} alerta={t.gananciaProyectada < 0} />
        <Tot
          label={`Ganancia real (${t.proyectosConCompras} con compras)`}
          valor={t.proyectosConCompras === 0 ? "—" : money.format(t.gananciaReal)}
          alerta={t.proyectosConCompras > 0 && t.gananciaReal < 0}
        />
      </div>

      <div className="overflow-auto rounded-md border border-neutral-200">
        <table className="w-full min-w-[880px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="bg-neutral-50 px-3 py-2">Proyecto</th>
              <th className="bg-neutral-50 px-3 py-2 text-right">Aprobado</th>
              <th className="bg-neutral-50 px-3 py-2 text-right">Presupuesto</th>
              <th className="bg-neutral-50 px-3 py-2 text-right">Gastado</th>
              <th className="bg-neutral-50 px-3 py-2 text-right">Disponible</th>
              <th className="bg-neutral-50 px-3 py-2 text-right">Ganancia real</th>
              <th className="bg-neutral-50 px-3 py-2">Plata</th>
              <th className="bg-neutral-50 px-3 py-2">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => {
              return (
                <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <Link href={`/gestion/proyectos/${r.id}`} className="font-semibold text-emerald-700 hover:underline">
                      {r.nombre}
                    </Link>
                    <div className="text-[11px] text-neutral-400">
                      {r.codigo || "—"} · {r.cliente}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.sinValorAprobado ? "—" : money.format(r.valorAprobado)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{money.format(r.plan)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money.format(r.comprometido)}
                    {r.pagado !== r.comprometido && (
                      <span className="block text-[11px] text-neutral-400">pagado {money.format(r.pagado)}</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${r.disponible < 0 ? "text-red-600" : ""}`}>
                    {money.format(r.disponible)}
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${!r.sinValorAprobado && r.comprometido > 0 && r.gananciaReal < 0 ? "text-red-600" : "text-emerald-900"}`}>
                    {r.sinValorAprobado ? (
                      <span className="font-normal text-neutral-400">sin valor aprobado</span>
                    ) : r.comprometido === 0 ? (
                      <span className="font-normal text-neutral-400">sin compras aún</span>
                    ) : (
                      money.format(r.gananciaReal)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLATA_CLS[r.semaforoPlata]}`}>
                      {etiquetaPlata(r.semaforoPlata)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIEMPO_CLS[r.tiempo]}`}>
                      {etiquetaTiempo(r.tiempo, r.diasTiempo)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                  {rows.length === 0 ? "No hay proyectos activos." : "Ningún proyecto para este cliente."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">
        &quot;Gastado&quot; = todas las compras registradas contra el proyecto (comprometido). La ganancia se muestra antes de retención en la fuente e ICA; el efectivo neto está en la ficha de cada proyecto.
      </p>
    </section>
  );
}

function Tot({ label, valor, alerta, icon }: { label: string; valor: string; alerta?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center gap-1 text-[11px] uppercase text-neutral-500">
        {icon} {label}
      </div>
      <div className={`mt-1 text-base font-bold tabular-nums ${alerta ? "text-red-600" : "text-emerald-900"}`}>{valor}</div>
    </div>
  );
}

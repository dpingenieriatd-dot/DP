"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, TrendingUp } from "lucide-react";
import { money, type EstadoPlata, type EstadoTiempo } from "@/lib/finance";

export type FilaControl = {
  id: string;
  codigo: string | null;
  nombre: string;
  cliente: string;
  clienteId: string | null;
  estado: string;
  valorAprobado: number;
  plan: number;
  comprometido: number;
  pagado: number;
  disponible: number;
  gananciaProyectada: number;
  gananciaReal: number;
  ejecutadoPct: number;
  semaforoPlata: EstadoPlata;
  sinValorAprobado: boolean;
  tiempo: EstadoTiempo;
  diasTiempo: number | null;
};

const PLATA_PILL: Record<EstadoPlata, { txt: string; cls: string }> = {
  sano: { txt: "En presupuesto", cls: "bg-emerald-100 text-emerald-800" },
  riesgo: { txt: "En atención", cls: "bg-amber-100 text-amber-800" },
  critico: { txt: "Sobre presupuesto", cls: "bg-red-100 text-red-700" },
};

function tiempoPill(t: EstadoTiempo, dias: number | null) {
  switch (t) {
    case "a_tiempo":
      return { txt: "A tiempo", cls: "bg-emerald-100 text-emerald-800" };
    case "por_vencer":
      return { txt: `Vence en ${dias} d`, cls: "bg-amber-100 text-amber-800" };
    case "atrasado":
      return { txt: `Atrasado ${Math.abs(dias ?? 0)} d`, cls: "bg-red-100 text-red-700" };
    case "cerrado":
      return { txt: "Cerrado", cls: "bg-neutral-200 text-neutral-600" };
    default:
      return { txt: "Sin fecha", cls: "bg-neutral-100 text-neutral-500" };
  }
}

export function ControlProyectos({ rows }: { rows: FilaControl[] }) {
  const [clienteFiltro, setClienteFiltro] = useState("");

  const clientes = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.clienteId && m.set(r.clienteId, r.cliente));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visibles = clienteFiltro ? rows.filter((r) => r.clienteId === clienteFiltro) : rows;

  const t = useMemo(() => {
    const conValor = visibles.filter((r) => !r.sinValorAprobado);
    return {
      activos: visibles.length,
      enRiesgo: visibles.filter((r) => r.semaforoPlata !== "sano").length,
      atrasados: visibles.filter((r) => r.tiempo === "atrasado").length,
      gananciaProyectada: conValor.reduce((s, r) => s + r.gananciaProyectada, 0),
      gananciaReal: conValor.reduce((s, r) => s + r.gananciaReal, 0),
      comprometido: visibles.reduce((s, r) => s + r.comprometido, 0),
    };
  }, [visibles]);

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
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tot label="Proyectos activos" valor={String(t.activos)} />
        <Tot label="En atención / sobre presup." valor={String(t.enRiesgo)} alerta={t.enRiesgo > 0} icon={<AlertTriangle size={13} />} />
        <Tot label="Atrasados" valor={String(t.atrasados)} alerta={t.atrasados > 0} icon={<CalendarClock size={13} />} />
        <Tot label="Comprometido en compras" valor={money.format(t.comprometido)} />
        <Tot label="Ganancia proyectada" valor={money.format(t.gananciaProyectada)} alerta={t.gananciaProyectada < 0} />
        <Tot label="Ganancia real (según compras)" valor={money.format(t.gananciaReal)} alerta={t.gananciaReal < 0} />
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
              const plata = PLATA_PILL[r.semaforoPlata];
              const tp = tiempoPill(r.tiempo, r.diasTiempo);
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
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${!r.sinValorAprobado && r.gananciaReal < 0 ? "text-red-600" : "text-emerald-900"}`}>
                    {r.sinValorAprobado ? <span className="font-normal text-neutral-400">sin valor aprobado</span> : money.format(r.gananciaReal)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${plata.cls}`}>{plata.txt}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tp.cls}`}>{tp.txt}</span>
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

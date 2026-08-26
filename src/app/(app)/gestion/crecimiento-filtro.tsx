"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { MESES } from "@/lib/meses";

const selectClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";
const labelClass = "block text-xs font-medium text-neutral-500";

export function CrecimientoFiltro({
  anios,
  clientes,
  empresas,
}: {
  anios: number[];
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const anio = searchParams.get("anio") ?? String(anios[anios.length - 1] ?? new Date().getFullYear());
  const mes = searchParams.get("mes") ?? "";
  const clienteId = searchParams.get("cliente") ?? "";
  const empresaId = searchParams.get("empresa") ?? "";

  function set(clave: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(clave, value);
    else sp.delete(clave);
    if (!sp.get("anio")) sp.set("anio", anio);
    router.push(`/gestion?${sp.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[0.7fr_1fr_1.4fr_1.4fr]">
      <div>
        <label className={labelClass}>Año</label>
        <select value={anio} onChange={(e) => set("anio", e.target.value)} className={selectClass}>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Mes</label>
        <select value={mes} onChange={(e) => set("mes", e.target.value)} className={selectClass}>
          <option value="">Todo el año</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Cliente</label>
        <select value={clienteId} onChange={(e) => set("cliente", e.target.value)} className={selectClass}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Empresa atendida</label>
        <select value={empresaId} onChange={(e) => set("empresa", e.target.value)} className={selectClass}>
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function LimpiarFiltrosBoton({ anio }: { anio: number }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/gestion?anio=${anio}`)}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
    >
      <RefreshCw size={14} /> Limpiar filtros
    </button>
  );
}

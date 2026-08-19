"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MESES } from "@/lib/meses";

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
  const hayFiltros = !!(mes || clienteId || empresaId);

  function set(clave: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(clave, value);
    else sp.delete(clave);
    if (!sp.get("anio")) sp.set("anio", anio);
    router.push(`/gestion?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-neutral-600">
        Año{" "}
        <select value={anio} onChange={(e) => set("anio", e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-neutral-600">
        Mes{" "}
        <select value={mes} onChange={(e) => set("mes", e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Todo el año</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-neutral-600">
        Cliente{" "}
        <select value={clienteId} onChange={(e) => set("cliente", e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-neutral-600">
        Empresa atendida{" "}
        <select value={empresaId} onChange={(e) => set("empresa", e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      {hayFiltros && (
        <button
          onClick={() => router.push(`/gestion?anio=${anio}`)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

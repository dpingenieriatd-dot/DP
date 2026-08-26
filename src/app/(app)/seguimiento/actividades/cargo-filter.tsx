"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Mismo orden y textos que CARGO_OPTIONS en el HTML de referencia.
const CARGOS = [
  "Directora de Proyectos",
  "Coordinadora Administrativa y Financiera",
  "Marketing y Mercadeo",
  "Ingeniera Industrial SST",
  "Psicóloga SST Campo",
  "Auxiliar Administrativo",
  "Gerente",
  "Profesional externo",
];

export function CargoFilter({ busqueda, onBusquedaChange }: { busqueda: string; onBusquedaChange: (v: string) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cargo = searchParams.get("cargo") ?? "";
  const hayFiltros = !!(cargo || busqueda);

  function setCargo(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set("cargo", value);
    else sp.delete("cargo");
    const query = sp.toString();
    router.push(`/seguimiento/actividades${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={cargo} onChange={(e) => setCargo(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
        <option value="">Todos los cargos</option>
        {CARGOS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        value={busqueda}
        onChange={(e) => onBusquedaChange(e.target.value)}
        placeholder="Buscar actividad, cliente o proyecto"
        className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      {hayFiltros && (
        <button
          onClick={() => {
            onBusquedaChange("");
            router.push("/seguimiento/actividades");
          }}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

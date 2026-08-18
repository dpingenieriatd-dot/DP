"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Etiquetas tal como las pidió el cliente. La comparación real contra el dato guardado en
// profiles/actividades es normalizada (trim + minúsculas + "empieza con") porque el dato real
// tiene variantes de mayúsculas, un espacio final en algunos registros, y "Gerente General" en
// vez de "Gerente" — ver src/app/(app)/seguimiento/actividades/page.tsx.
const CARGOS = [
  "Directora de Proyectos",
  "Marketing y Mercadeo",
  "Ingeniera Industrial SST",
  "Psicóloga SST Campo",
  "Auxiliar Administrativo",
  "Gerente",
];

export function CargoFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cargo = searchParams.get("cargo") ?? "";

  function set(value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set("cargo", value);
    else sp.delete("cargo");
    const query = sp.toString();
    router.push(`/seguimiento/actividades${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-neutral-600">
        Cargo{" "}
        <select
          value={cargo}
          onChange={(e) => set(e.target.value)}
          className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos los cargos</option>
          {CARGOS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {cargo && (
        <button
          onClick={() => set("")}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

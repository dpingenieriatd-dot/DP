"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FechaFiltro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";
  const hayFiltros = !!(desde || hasta);

  function set(clave: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value) sp.set(clave, value);
    else sp.delete(clave);
    const query = sp.toString();
    router.push(`/seguimiento/efectividad${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-neutral-600">
        Asignada desde{" "}
        <input type="date" value={desde} onChange={(e) => set("desde", e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="text-sm text-neutral-600">
        Asignada hasta{" "}
        <input type="date" value={hasta} onChange={(e) => set("hasta", e.target.value)} className="ml-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
      </label>
      {hayFiltros && (
        <button
          onClick={() => router.push("/seguimiento/efectividad")}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  );
}

import { cookies } from "next/headers";

/** Filtro global "Todos / <persona>" del módulo Seguimiento — igual que #manager-filter en el HTML de referencia. */
export async function getResponsableFiltro(): Promise<string> {
  const store = await cookies();
  return store.get("sf_responsable")?.value || "";
}

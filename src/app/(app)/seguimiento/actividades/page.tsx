import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ActividadesList } from "./list";
import { CargoFilter } from "./cargo-filter";

/** Normaliza para comparar cargos: el dato real trae variantes de mayúsculas y espacios sueltos. */
function normCargo(s: string | null) {
  return (s ?? "").trim().toLowerCase();
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cargo?: string; estado?: string; desde?: string; hasta?: string }>;
}) {
  const { cargo: cargoFiltro, estado: estadoFiltro, desde, hasta } = await searchParams;
  const supabase = await createClient();
  const [{ data: rows }, { data: clientes }, { data: proyectos }, { data: empresas }, { data: actividadesCatalogo }, { data: procesos }, userLabel] =
    await Promise.all([
      supabase.from("actividades").select("*").order("fecha", { ascending: false }),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
      supabase.from("empresas_atendidas").select("id, nombre").order("nombre"),
      supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido").order("codigo"),
      supabase.from("procesos").select("codigo, nombre").order("codigo"),
      getCurrentProfileLabel(),
    ]);

  const todos = rows ?? [];
  const items = todos
    .filter((r) => !cargoFiltro || normCargo(r.cargo).startsWith(normCargo(cargoFiltro)))
    .filter((r) => !estadoFiltro || r.estado === estadoFiltro)
    .filter((r) => !desde || (r.fecha && r.fecha >= desde))
    .filter((r) => !hasta || (r.fecha && r.fecha <= hasta));
  const cumplidas = items.filter((r) => r.estado === "Cumplido").length;
  const pendientes = items.filter((r) => r.estado === "Pendiente" || r.estado === "Parcial").length;
  const noCumplidas = items.filter((r) => r.estado === "No cumplido").length;

  return (
    <div className="flex flex-col lg:h-full">
      <Topbar title="Actividades" subtitle="Registro histórico con filtro por cargo" userLabel={userLabel ?? undefined} />
      <div className="px-8 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-neutral-500">Registro histórico de actividades del equipo.</p>
          <CargoFilter />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Cumplidas" value={cumplidas} color="emerald" />
          <KpiCard label="Pendientes / parciales" value={pendientes} color="amber" />
          <KpiCard label="No cumplidas" value={noCumplidas} color="red" />
        </div>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <ActividadesList
          rows={items}
          clientes={clientes ?? []}
          proyectos={proyectos ?? []}
          empresas={empresas ?? []}
          actividadesCatalogo={actividadesCatalogo ?? []}
          procesos={procesos ?? []}
        />
      </div>
    </div>
  );
}

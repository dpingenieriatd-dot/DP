import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { CrudTable, type Field } from "@/components/crud-table";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { createActividad, updateActividad, deleteActividad } from "./actions";
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
  const [{ data: rows }, { data: clientes }, { data: proyectos }, userLabel] = await Promise.all([
    supabase.from("actividades").select("*").order("fecha", { ascending: false }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
    getCurrentProfileLabel(),
  ]);

  const fields: Field[] = [
    { key: "fecha", label: "Fecha", type: "date", required: true },
    { key: "hora", label: "Hora de inicio (crea el bloque en Agenda)", type: "time" },
    { key: "cargo", label: "Cargo" },
    { key: "actividad", label: "Actividad", required: true },
    {
      key: "cliente_id",
      label: "Cliente",
      type: "select",
      optionEntries: (clientes ?? []).map((c) => ({ value: c.id, label: c.nombre })),
    },
    {
      key: "proyecto_id",
      label: "Proyecto",
      type: "select",
      optionEntries: (proyectos ?? []).map((p) => ({ value: p.id, label: p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre })),
    },
    { key: "estado", label: "Estado", type: "select", options: ["Cumplido", "Parcial", "Pendiente", "No cumplido"] },
    { key: "origen", label: "Origen", tableOnly: true },
    { key: "observaciones", label: "Observaciones", type: "textarea" },
    { key: "respuesta", label: "Respuesta", type: "textarea" },
  ];

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
        <CrudTable
          title="Actividades"
          fields={fields}
          rows={items}
          onCreate={createActividad}
          onUpdate={updateActividad}
          onDelete={deleteActividad}
          emptyLabel="Sin actividades registradas todavía."
        />
      </div>
    </div>
  );
}

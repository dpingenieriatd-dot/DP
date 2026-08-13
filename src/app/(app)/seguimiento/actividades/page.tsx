import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createActividad, updateActividad, deleteActividad } from "./actions";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: rows }, { data: clientes }, { data: proyectos }] = await Promise.all([
    supabase.from("actividades").select("*").order("fecha", { ascending: false }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
  ]);

  const fields: Field[] = [
    { key: "fecha", label: "Fecha", type: "date", required: true },
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

  const items = rows ?? [];
  const cumplidas = items.filter((r) => r.estado === "Cumplido").length;
  const pendientes = items.filter((r) => r.estado === "Pendiente" || r.estado === "Parcial").length;
  const noCumplidas = items.filter((r) => r.estado === "No cumplido").length;

  return (
    <div>
      <div className="px-8 pt-8">
        <p className="text-sm text-neutral-500">Registro histórico de actividades del equipo.</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="Cumplidas" valor={cumplidas} />
          <Kpi label="Pendientes / parciales" valor={pendientes} />
          <Kpi label="No cumplidas" valor={noCumplidas} />
        </div>
      </div>
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
  );
}

function Kpi({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-emerald-900">{valor}</div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createInsumo, updateInsumo, deleteInsumo } from "./actions";

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "categoria", label: "Categoría" },
  { key: "descripcion", label: "Insumo o servicio", required: true },
  { key: "unidad", label: "Unidad" },
  { key: "servicio", label: "Servicio (si no es insumo físico)" },
  { key: "costo", label: "Costo de referencia", type: "number" },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("insumos").select("*").order("descripcion");

  return (
    <CrudTable
      title="Banco de insumos"
      subtitle="Catálogos · Ítems en orden alfabético"
      newLabel="Nuevo ítem"
      banner={
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Banco simplificado.</strong> Cada insumo o servicio aparece una sola vez. Puedes actualizar su costo de referencia directamente desde esta tabla.
        </div>
      }
      fields={fields}
      rows={rows ?? []}
      onCreate={createInsumo}
      onUpdate={updateInsumo}
      onDelete={deleteInsumo}
    />
  );
}

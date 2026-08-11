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
      fields={fields}
      rows={rows ?? []}
      onCreate={createInsumo}
      onUpdate={updateInsumo}
      onDelete={deleteInsumo}
    />
  );
}

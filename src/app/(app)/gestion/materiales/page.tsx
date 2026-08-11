import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createMaterial, updateMaterial, deleteMaterial } from "./actions";

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre", required: true },
  { key: "categoria", label: "Categoría" },
  { key: "custodio", label: "Custodio" },
  { key: "valor_reposicion", label: "Valor de reposición", type: "number" },
  { key: "vida_util_jornadas", label: "Vida útil (jornadas)", type: "number" },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("materiales").select("*").order("nombre");

  return (
    <CrudTable
      title="Materiales de trabajo"
      fields={fields}
      rows={rows ?? []}
      onCreate={createMaterial}
      onUpdate={updateMaterial}
      onDelete={deleteMaterial}
    />
  );
}

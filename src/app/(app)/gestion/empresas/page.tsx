import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createEmpresa, updateEmpresa, deleteEmpresa } from "./actions";

const fields: Field[] = [
  { key: "nombre", label: "Nombre", required: true },
  { key: "ciudad", label: "Ciudad" },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("empresas_atendidas").select("*").order("nombre");

  return (
    <CrudTable
      title="Empresas atendidas"
      fields={fields}
      rows={rows ?? []}
      onCreate={createEmpresa}
      onUpdate={updateEmpresa}
      onDelete={deleteEmpresa}
    />
  );
}

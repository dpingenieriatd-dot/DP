import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createProfesional, updateProfesional, deleteProfesional } from "./actions";

const fields: Field[] = [
  { key: "documento", label: "Documento" },
  { key: "nombre", label: "Nombre", required: true },
  { key: "ciudad", label: "Ciudad" },
  { key: "perfil", label: "Perfil" },
  { key: "especialidad", label: "Especialidad" },
  { key: "tarifa_hora", label: "Tarifa por hora", type: "number" },
  { key: "jornada", label: "Valor jornada", type: "number" },
  { key: "tipo_vinculo", label: "Tipo de vínculo", type: "select", options: ["Empleado", "Contratista", "Freelance"] },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("profesionales").select("*").order("nombre");

  return (
    <CrudTable
      title="Profesionales"
      fields={fields}
      rows={rows ?? []}
      onCreate={createProfesional}
      onUpdate={updateProfesional}
      onDelete={deleteProfesional}
    />
  );
}

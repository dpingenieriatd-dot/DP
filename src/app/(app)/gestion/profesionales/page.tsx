import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createProfesional, updateProfesional, deleteProfesional } from "./actions";

const fields: Field[] = [
  { key: "documento", label: "Cédula" },
  { key: "nombre", label: "Nombre completo", required: true },
  { key: "ciudad", label: "Ciudad" },
  { key: "tipo_vinculo", label: "Vínculo", type: "select", options: ["Directo", "Indirecto"] },
  { key: "correo", label: "Correo", type: "email" },
  { key: "telefono", label: "Teléfono" },
  { key: "telefono_emergencia", label: "Teléfono de emergencias" },
  { key: "perfil", label: "Perfil / profesión" },
  { key: "especialidad", label: "Especialidad" },
  { key: "tarifa_hora", label: "Tarifa por hora", type: "number" },
  { key: "jornada", label: "Valor jornada", type: "number" },
  { key: "eps", label: "EPS" },
  { key: "arl", label: "ARL" },
  { key: "carpeta", label: "Link a la carpeta de documentos" },
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

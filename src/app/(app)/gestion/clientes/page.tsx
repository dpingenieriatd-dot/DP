import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createCliente, updateCliente, deleteCliente } from "./actions";

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre", required: true },
  { key: "tipo", label: "Tipo", type: "select", options: ["Empresa privada", "Empresa pública", "Empresa mixta", "Persona natural"] },
  { key: "sector", label: "Sector" },
  { key: "nit", label: "NIT" },
  { key: "contacto", label: "Contacto" },
  { key: "nombre_asesor", label: "Nombre del asesor" },
  { key: "telefono", label: "Teléfono" },
  { key: "correo", label: "Correo", type: "email" },
  { key: "direccion", label: "Dirección" },
  { key: "ciudad", label: "Ciudad" },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("clientes").select("*").order("nombre");

  return (
    <CrudTable
      title="Clientes"
      subtitle="Catálogos · Orden alfabético por cliente"
      newLabel="Nuevo cliente"
      fields={fields}
      rows={rows ?? []}
      onCreate={createCliente}
      onUpdate={updateCliente}
      onDelete={deleteCliente}
    />
  );
}

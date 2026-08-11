import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createCliente, updateCliente, deleteCliente } from "./actions";

const fields: Field[] = [
  { key: "nombre", label: "Nombre", required: true },
  { key: "nit", label: "NIT" },
  { key: "contacto", label: "Contacto" },
  { key: "telefono", label: "Teléfono" },
  { key: "correo", label: "Correo", type: "email" },
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
      fields={fields}
      rows={rows ?? []}
      onCreate={createCliente}
      onUpdate={updateCliente}
      onDelete={deleteCliente}
    />
  );
}

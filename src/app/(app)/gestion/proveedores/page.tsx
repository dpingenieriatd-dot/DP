import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createProveedor, updateProveedor, deleteProveedor } from "./actions";

const fields: Field[] = [
  { key: "nombre", label: "Nombre / razón social", required: true },
  { key: "nit", label: "NIT" },
  { key: "contacto", label: "Contacto" },
  { key: "telefono", label: "Teléfono" },
  { key: "correo", label: "Correo", type: "email" },
  { key: "ciudad", label: "Ciudad" },
  { key: "forma_pago", label: "Forma de pago", type: "select", options: ["Transferencia", "Contado", "Crédito", "Anticipo y saldo"] },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("proveedores").select("*").order("nombre");

  return (
    <CrudTable
      title="Proveedores"
      fields={fields}
      rows={rows ?? []}
      onCreate={createProveedor}
      onUpdate={updateProveedor}
      onDelete={deleteProveedor}
    />
  );
}

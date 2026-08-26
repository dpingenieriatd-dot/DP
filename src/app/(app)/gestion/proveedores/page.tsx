import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createProveedor, updateProveedor, deleteProveedor } from "./actions";

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre / razón social", required: true },
  { key: "nit", label: "NIT" },
  { key: "tipo", label: "Tipo" },
  { key: "contacto", label: "Contacto" },
  { key: "correo", label: "Correo", type: "email" },
  { key: "telefono", label: "Teléfono" },
  { key: "direccion", label: "Dirección" },
  { key: "ciudad", label: "Ciudad" },
  { key: "forma_pago", label: "Forma de pago", type: "select", options: ["Transferencia", "Contado", "Crédito", "Anticipo y saldo"] },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "nombre_asesor", label: "Nombre del asesor" },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("proveedores").select("*").order("nombre");

  return (
    <CrudTable
      title="Proveedores"
      subtitle="Catálogos · Orden alfabético por proveedor"
      newLabel="Nuevo proveedor"
      fields={fields}
      rows={rows ?? []}
      onCreate={createProveedor}
      onUpdate={updateProveedor}
      onDelete={deleteProveedor}
    />
  );
}

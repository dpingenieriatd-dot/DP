import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createProveedor, updateProveedor, deleteProveedor } from "./actions";

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre / razón social", required: true },
  { key: "tipo", label: "Tipo" },
  { key: "nit", label: "NIT" },
  { key: "contacto", label: "Contacto" },
  { key: "nombre_asesor", label: "Nombre del asesor" },
  { key: "telefono", label: "Teléfono" },
  { key: "correo", label: "Correo", type: "email" },
  { key: "direccion", label: "Dirección" },
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

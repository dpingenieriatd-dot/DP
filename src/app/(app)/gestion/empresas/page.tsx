import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createEmpresa, updateEmpresa, deleteEmpresa } from "./actions";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: rows }, { data: clientes }] = await Promise.all([
    supabase.from("empresas_atendidas").select("*").order("nombre"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  const fields: Field[] = [
    { key: "nombre", label: "Empresa atendida", required: true },
    {
      key: "cliente_id",
      label: "Cliente",
      type: "select",
      optionEntries: (clientes ?? []).map((c) => ({ value: c.id, label: c.nombre })),
    },
    { key: "nit", label: "NIT" },
    { key: "sector", label: "Sector" },
    { key: "contacto", label: "Contacto" },
    { key: "correo", label: "Correo del contacto", type: "email" },
    { key: "telefono", label: "Teléfono del contacto" },
    { key: "direccion", label: "Dirección" },
    { key: "ciudad", label: "Ciudad" },
    { key: "asesor", label: "Nombre del asesor" },
    { key: "telefono_asesor", label: "Teléfono del asesor" },
    { key: "correo_asesor", label: "Correo electrónico del asesor", type: "email" },
    { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
    { key: "notas", label: "Observaciones", type: "textarea" },
  ];

  return (
    <CrudTable
      title="Empresas atendidas"
      subtitle="Catálogos · Orden alfabético por empresa"
      newLabel="Nueva empresa"
      fields={fields}
      rows={rows ?? []}
      onCreate={createEmpresa}
      onUpdate={updateEmpresa}
      onDelete={deleteEmpresa}
    />
  );
}

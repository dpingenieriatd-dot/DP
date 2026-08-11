import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createEmpresa, updateEmpresa, deleteEmpresa } from "./actions";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: rows }, { data: clientes }] = await Promise.all([
    supabase.from("empresas_atendidas").select("*").order("nombre"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  const clienteNombre = (id: unknown) => clientes?.find((c) => c.id === id)?.nombre ?? "—";

  const fields: Field[] = [
    { key: "nombre", label: "Empresa atendida", required: true },
    {
      key: "cliente_id",
      label: "Cliente",
      type: "select",
      optionEntries: (clientes ?? []).map((c) => ({ value: c.id, label: c.nombre })),
      display: (v) => clienteNombre(v),
    },
    { key: "nit", label: "NIT" },
    { key: "sector", label: "Sector" },
    { key: "contacto", label: "Contacto" },
    { key: "correo", label: "Correo", type: "email" },
    { key: "telefono", label: "Teléfono" },
    { key: "ciudad", label: "Ciudad" },
    { key: "asesor", label: "Asesor D&P" },
    { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
    { key: "notas", label: "Observaciones", type: "textarea" },
  ];

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

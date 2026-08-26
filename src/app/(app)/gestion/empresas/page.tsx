import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createEmpresa, updateEmpresa, deleteEmpresa } from "./actions";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; cliente_id?: string; nuevo?: string }>;
}) {
  const { cliente, cliente_id, nuevo } = await searchParams;
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
      linkKey: "_cliente_href",
    },
    { key: "nit", label: "NIT" },
    { key: "sector", label: "Sector" },
    { key: "contacto", label: "Contacto" },
    { key: "cargo", label: "Cargo" },
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

  const rowsConLink = (rows ?? []).map((row) => {
    const nombreCliente = clientes?.find((c) => c.id === row.cliente_id)?.nombre;
    return {
      ...row,
      _cliente_href: nombreCliente ? `/gestion/clientes?columna=nombre&valor=${encodeURIComponent(nombreCliente)}` : null,
    };
  });

  return (
    <CrudTable
      title="Empresas atendidas"
      subtitle="Catálogos · Orden alfabético por empresa"
      newLabel="Nueva empresa"
      fields={fields}
      rows={rowsConLink}
      onCreate={createEmpresa}
      onUpdate={updateEmpresa}
      onDelete={deleteEmpresa}
      initialFiltro={cliente ? { columna: "cliente_id", valor: cliente } : undefined}
      presetNuevo={nuevo === "1" ? { cliente_id: cliente_id ?? "" } : undefined}
    />
  );
}

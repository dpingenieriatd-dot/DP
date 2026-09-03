import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field, type Row } from "@/components/crud-table";
import { createCliente, updateCliente, deleteCliente } from "./actions";

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre", required: true },
  { key: "nit", label: "NIT" },
  { key: "tipo", label: "Tipo", type: "select", options: ["Empresa privada", "Empresa pública", "Empresa mixta", "Persona natural"] },
  { key: "sector", label: "Sector" },
  { key: "contacto", label: "Contacto" },
  { key: "cargo", label: "Cargo" },
  { key: "correo", label: "Correo", type: "email" },
  { key: "telefono", label: "Teléfono" },
  { key: "ciudad", label: "Ciudad" },
  { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
  { key: "retencion_fuente_pct", label: "Retención en la fuente (%)", type: "number" },
  { key: "ica_por_mil", label: "Tarifa de ICA (por mil)", type: "number" },
  { key: "nombre_asesor", label: "Nombre del asesor" },
  { key: "direccion", label: "Dirección" },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ columna?: string; valor?: string }>;
}) {
  const { columna, valor } = await searchParams;
  const supabase = await createClient();
  const { data: rows } = await supabase.from("clientes").select("*").order("nombre");

  const rowActionsById: Record<string, React.ReactNode> = {};
  for (const row of (rows ?? []) as Row[]) {
    const id = String(row.id);
    rowActionsById[id] = (
      <>
        <Link
          href={`/gestion/empresas?cliente=${encodeURIComponent(String(row.nombre ?? ""))}`}
          className="mr-2 text-xs font-medium text-blue-700 hover:underline"
        >
          Ver empresas
        </Link>
        <Link
          href={`/gestion/empresas?nuevo=1&cliente_id=${id}`}
          className="mr-2 text-xs font-medium text-blue-700 hover:underline"
        >
          + Empresa
        </Link>
      </>
    );
  }

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
      initialFiltro={columna && valor ? { columna, valor } : undefined}
      rowActionsById={rowActionsById}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createMaterial, updateMaterial, deleteMaterial } from "./actions";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre", required: true },
  { key: "categoria", label: "Categoría" },
  { key: "custodio", label: "Custodio" },
  { key: "valor_reposicion", label: "Valor de reposición", type: "number" },
  { key: "vida_util_jornadas", label: "Vida útil (jornadas)", type: "number" },
  {
    key: "costo_jornada",
    label: "Costo/jornada",
    tableOnly: true,
    display: (_v, row) => {
      const vida = Number(row.vida_util_jornadas || 0);
      return vida > 0 ? money.format(Number(row.valor_reposicion || 0) / vida) : "—";
    },
  },
  { key: "estado", label: "Estado", type: "select", options: ["Disponible", "En uso", "En mantenimiento", "Dado de baja"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("materiales").select("*").order("nombre");

  return (
    <CrudTable
      title="Materiales de trabajo"
      fields={fields}
      rows={rows ?? []}
      onCreate={createMaterial}
      onUpdate={updateMaterial}
      onDelete={deleteMaterial}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { KpiCard } from "@/components/kpi-card";
import { createMaterial, updateMaterial, deleteMaterial } from "./actions";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre", required: true },
  { key: "categoria", label: "Categoría" },
  { key: "custodio", label: "Custodio" },
  { key: "valor_reposicion", label: "Valor de reposición", type: "number" },
  { key: "vida_util_jornadas", label: "Vida útil (jornadas)", type: "number" },
  { key: "costo_jornada", label: "Costo/jornada", tableOnly: true },
  { key: "estado", label: "Estado", type: "select", options: ["Disponible", "En uso", "En mantenimiento", "Dado de baja"] },
  { key: "notas", label: "Observaciones", type: "textarea" },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("materiales").select("*").order("nombre");

  const items = (rows ?? []).map((r) => {
    const vida = Number(r.vida_util_jornadas || 0);
    const costo_jornada = vida > 0 ? money.format(Number(r.valor_reposicion || 0) / vida) : "—";
    return { ...r, costo_jornada };
  });

  const valorTotal = items.reduce((s, r) => s + Number(r.valor_reposicion || 0), 0);

  return (
    <CrudTable
      title="Inventario materiales"
      subtitle="Catálogos · Orden alfabético por material"
      newLabel="Nuevo material"
      banner={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard label="Referencias" value={items.length} color="emerald" />
          <KpiCard label="Valor reposición" value={money.format(valorTotal)} color="emerald" />
        </div>
      }
      fields={fields}
      rows={items}
      onCreate={createMaterial}
      onUpdate={updateMaterial}
      onDelete={deleteMaterial}
    />
  );
}

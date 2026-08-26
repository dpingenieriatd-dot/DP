import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { KpiCard } from "@/components/kpi-card";
import { createMaterial, updateMaterial, deleteMaterial } from "./actions";

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const CATEGORIAS = ["Equipos de medición", "Tecnología", "Pruebas", "Emergencia", "Mobiliario", "Otros"];

const fields: Field[] = [
  { key: "codigo", label: "Código", tableOnly: true },
  { key: "nombre", label: "Nombre del material", placeholder: "Ej. Videobeam portátil", required: true, fullWidth: true },
  { key: "categoria", label: "Categoría", type: "select", options: CATEGORIAS },
  { key: "cantidad", label: "Cantidad en stock", type: "number", required: true },
  { key: "ubicacion", label: "Ubicación en almacén", placeholder: "Ej. Almacén oficina · Estante A-1", required: true, fullWidth: true },
  { key: "custodio", label: "Custodio", placeholder: "Nombre del responsable" },
  { key: "estado", label: "Estado", type: "select", options: ["Disponible", "En uso", "En mantenimiento", "Dado de baja"] },
  { key: "valor_reposicion", label: "Valor de reposición", type: "number", required: true },
  { key: "vida_util_jornadas", label: "Vida útil (jornadas)", type: "number" },
  { key: "costo_jornada", label: "Costo/jornada", tableOnly: true },
  { key: "notas", label: "Observaciones", type: "textarea", formOnly: true },
];

export default async function Page() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("materiales").select("*").order("nombre");

  const items = (rows ?? []).map((r) => {
    const vida = Number(r.vida_util_jornadas || 0);
    const costo_jornada = vida > 0 ? money.format(Number(r.valor_reposicion || 0) / vida) : "—";
    return { ...r, costo_jornada };
  });

  const unidadesTotal = items.reduce((s, r) => s + Number(r.cantidad || 0), 0);
  const valorTotal = items.reduce((s, r) => s + Number(r.valor_reposicion || 0) * Number(r.cantidad || 1), 0);

  return (
    <CrudTable
      title="Inventario materiales"
      subtitle="Catálogos · Orden alfabético por material"
      newLabel="Nuevo material"
      createTitle="Nuevo material de trabajo"
      editTitle="Editar material de trabajo"
      saveLabel="Guardar material"
      banner={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Referencias" value={items.length} color="emerald" />
          <KpiCard label="Unidades" value={unidadesTotal} color="emerald" />
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

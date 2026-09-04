import { createClient } from "@/lib/supabase/server";
import { CrudTable, type Field } from "@/components/crud-table";
import { createInsumo, updateInsumo, deleteInsumo } from "./actions";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: rows }, { data: proveedores }] = await Promise.all([
    supabase.from("insumos").select("*").order("codigo"),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
  ]);

  const fields: Field[] = [
    { key: "codigo", label: "Código", tableOnly: true },
    { key: "categoria", label: "Categoría", placeholder: "Papelería, servicios, logística..." },
    { key: "unidad", label: "Unidad", type: "select", options: ["unidad", "hora", "día", "minuto", "jornada", "noche"] },
    { key: "descripcion", label: "Ítem / descripción", placeholder: "Nombre del ítem", required: true, fullWidth: true },
    {
      key: "proveedor_id",
      label: "Proveedor (opcional)",
      type: "select",
      optionEntries: (proveedores ?? []).map((p) => ({ value: p.id, label: p.nombre })),
      formOnly: true,
    },
    { key: "costo", label: "Valor unitario / valor hora", type: "number", required: true },
    { key: "actualizacion", label: "Actualización", tableOnly: true },
    { key: "estado", label: "Estado", type: "select", options: ["Activo", "Inactivo"] },
    { key: "notas", label: "Observaciones", type: "textarea", formOnly: true },
  ];

  return (
    <CrudTable
      title="Banco de insumos"
      subtitle="Catálogos · Ítems en orden por código (clic en un encabezado para ordenar por esa columna)"
      newLabel="Nuevo ítem"
      createTitle="Nuevo ítem"
      editTitle="Editar ítem"
      saveLabel="Guardar ítem"
      banner={
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Banco simplificado.</strong> Cada insumo o servicio aparece una sola vez. Puedes actualizar su costo de referencia directamente desde esta tabla.
        </div>
      }
      fields={fields}
      rows={rows ?? []}
      onCreate={createInsumo}
      onUpdate={updateInsumo}
      onDelete={deleteInsumo}
    />
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function ruta(id: string) {
  return `/gestion/proyectos/${id}`;
}

export async function actualizarProyecto(id: string, formData: FormData) {
  const supabase = await createClient();

  const ivaAplica = formData.get("iva_aplica") === "on";
  const incluyeIva = formData.get("contrato_incluye_iva") === "on";

  const { error } = await supabase
    .from("proyectos")
    .update({
      nombre: formData.get("nombre"),
      cliente_id: formData.get("cliente_id") || null,
      responsable_id: formData.get("responsable_id") || null,
      admin_pct: formData.get("admin_pct") || null,
      margen_pct: formData.get("margen_pct") || 30,
      contrato_valor: formData.get("contrato_valor") || 0,
      iva_aplica: ivaAplica,
      iva_pct: formData.get("iva_pct") || 19,
      contrato_incluye_iva: incluyeIva,
      retencion_pct: formData.get("retencion_pct") || 0,
      ica_pct: formData.get("ica_pct") || 0,
      otras_retenciones: formData.get("otras_retenciones") || 0,
      fecha_inicio: formData.get("fecha_inicio") || null,
      fecha_fin: formData.get("fecha_fin") || null,
      estado: formData.get("estado") || "Planeado",
      notas: formData.get("notas") || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(ruta(id));
  revalidatePath("/gestion/proyectos");
}

async function recalcularPresupuestoDirecto(supabase: Awaited<ReturnType<typeof createClient>>, proyectoId: string) {
  const { data: items } = await supabase.from("presupuesto_items").select("cantidad, valor_unitario").eq("proyecto_id", proyectoId);
  const total = (items ?? []).reduce((a, i) => a + Number(i.cantidad) * Number(i.valor_unitario), 0);
  await supabase.from("proyectos").update({ presupuesto_directo: total }).eq("id", proyectoId);
}

export async function agregarItemPresupuesto(proyectoId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("presupuesto_items").insert({
    proyecto_id: proyectoId,
    recurso: formData.get("recurso"),
    cantidad: formData.get("cantidad") || 1,
    unidad: formData.get("unidad") || null,
    valor_unitario: formData.get("valor_unitario") || 0,
  });
  if (error) return { error: error.message };
  await recalcularPresupuestoDirecto(supabase, proyectoId);
  revalidatePath(ruta(proyectoId));
  revalidatePath("/gestion/proyectos");
}

export async function eliminarItemPresupuesto(proyectoId: string, itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("presupuesto_items").delete().eq("id", itemId);
  if (error) return { error: error.message };
  await recalcularPresupuestoDirecto(supabase, proyectoId);
  revalidatePath(ruta(proyectoId));
  revalidatePath("/gestion/proyectos");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function ruta(id: string) {
  return `/gestion/proyectos/${id}`;
}

export async function actualizarProyecto(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proyectos")
    .update({
      nombre: formData.get("nombre"),
      cliente_id: formData.get("cliente_id") || null,
      empresa_id: formData.get("empresa_id") || null,
      responsable_id: formData.get("responsable_id") || null,
      estado: formData.get("estado") || "Planeado",
      fecha_inicio: formData.get("fecha_inicio") || null,
      fecha_fin: formData.get("fecha_fin") || null,
      notas: formData.get("notas") || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(ruta(id));
  revalidatePath("/gestion/proyectos");
  return { ok: true };
}

/** Datos del contrato usados solo para el cálculo de efectivo neto esperado (IVA/retención/ICA) — ver calcularEfectivoEsperado en lib/finance.ts. */
export async function actualizarContrato(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("proyectos")
    .update({
      contrato_valor: Number(formData.get("contrato_valor") || 0),
      contrato_incluye_iva: formData.get("contrato_incluye_iva") === "on",
      iva_aplica: formData.get("iva_aplica") === "on",
      iva_pct: Number(formData.get("iva_pct") || 19),
      retencion_pct: Number(formData.get("retencion_pct") || 0),
      ica_pct: Number(formData.get("ica_pct") || 0),
      otras_retenciones: Number(formData.get("otras_retenciones") || 0),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(ruta(id));
  return { ok: true };
}

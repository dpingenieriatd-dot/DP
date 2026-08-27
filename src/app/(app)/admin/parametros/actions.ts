"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function actualizarSettings(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      admin_pct: formData.get("admin_pct") || 15,
      margin_pct: formData.get("margin_pct") || 30,
      iva_pct: formData.get("iva_pct") || 19,
      umbral_ejecucion_pct: formData.get("umbral_ejecucion_pct") || 80,
      dias_aviso_entrega: formData.get("dias_aviso_entrega") || 15,
      monthly_expenses: formData.get("monthly_expenses") || 0,
      monthly_income: formData.get("monthly_income") || 0,
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/parametros");
}

export async function actualizarEfectividadParametros(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("efectividad_parametros")
    .update({
      peso_cumplimiento: formData.get("peso_cumplimiento") || 50,
      peso_oportunidad: formData.get("peso_oportunidad") || 25,
      peso_calidad: formData.get("peso_calidad") || 15,
      peso_eficiencia_tiempo: formData.get("peso_eficiencia_tiempo") || 10,
      capacidad_semanal_estandar_horas: formData.get("capacidad_semanal_estandar_horas") || 40,
      actualizado_por: user?.id ?? null,
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin/parametros");
  revalidatePath("/seguimiento/efectividad");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function crearPresupuesto(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("presupuestos")
    .insert({
      proyecto_id: formData.get("proyecto_id"),
      codigo: formData.get("codigo") || null,
      nombre: formData.get("nombre"),
      costos: formData.get("costos") || 0,
      valor_cotizado: formData.get("valor_cotizado") || 0,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/gestion/presupuestos");
  redirect(`/gestion/presupuestos/${data.id}`);
}

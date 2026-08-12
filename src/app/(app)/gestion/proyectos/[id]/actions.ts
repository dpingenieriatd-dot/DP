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
      estado: formData.get("estado") || "Planeacion",
      fecha_inicio: formData.get("fecha_inicio") || null,
      fecha_fin: formData.get("fecha_fin") || null,
      notas: formData.get("notas") || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(ruta(id));
  revalidatePath("/gestion/proyectos");
}

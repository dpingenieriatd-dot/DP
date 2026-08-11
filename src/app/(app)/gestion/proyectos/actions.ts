"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function crearProyecto(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proyectos")
    .insert({
      codigo: formData.get("codigo"),
      nombre: formData.get("nombre"),
      cliente_id: formData.get("cliente_id") || null,
      empresa_id: formData.get("empresa_id") || null,
      responsable_id: formData.get("responsable_id") || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/gestion/proyectos");
  redirect(`/gestion/proyectos/${data.id}`);
}

export async function archivarProyecto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").update({ archivado: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gestion/proyectos");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "materiales";
const PATH = "/gestion/materiales";

function fromForm(formData: FormData) {
  return {
    codigo: formData.get("codigo") || null,
    nombre: formData.get("nombre") || null,
    categoria: formData.get("categoria") || null,
    cantidad: formData.get("cantidad") || 1,
    ubicacion: formData.get("ubicacion") || null,
    custodio: formData.get("custodio") || null,
    valor_reposicion: formData.get("valor_reposicion") || null,
    vida_util_jornadas: formData.get("vida_util_jornadas") || null,
    estado: formData.get("estado") || null,
    notas: formData.get("notas") || null,
  };
}

export async function createMaterial(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateMaterial(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteMaterial(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

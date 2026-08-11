"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "insumos";
const PATH = "/gestion/insumos";

function fromForm(formData: FormData) {
  return {
    codigo: formData.get("codigo") || null,
    categoria: formData.get("categoria") || null,
    descripcion: formData.get("descripcion") || null,
    unidad: formData.get("unidad") || null,
    servicio: formData.get("servicio") || null,
    costo: formData.get("costo") || null,
    estado: formData.get("estado") || null,
    notas: formData.get("notas") || null,
  };
}

export async function createInsumo(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateInsumo(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteInsumo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

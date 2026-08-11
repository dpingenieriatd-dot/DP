"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "empresas_atendidas";
const PATH = "/gestion/empresas";

function fromForm(formData: FormData) {
  return {
    nombre: formData.get("nombre") || null,
    ciudad: formData.get("ciudad") || null,
    estado: formData.get("estado") || null,
    notas: formData.get("notas") || null,
  };
}

export async function createEmpresa(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateEmpresa(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteEmpresa(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "actividades";
const PATH = "/seguimiento/actividades";

function fromForm(formData: FormData) {
  return {
    fecha: formData.get("fecha") || new Date().toISOString().slice(0, 10),
    cargo: formData.get("cargo") || null,
    actividad: formData.get("actividad") || null,
    cliente: formData.get("cliente") || null,
    estado: formData.get("estado") || "Pendiente",
    observaciones: formData.get("observaciones") || null,
    respuesta: formData.get("respuesta") || null,
  };
}

export async function createActividad(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert({ ...fromForm(formData), origen: "Manual" });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateActividad(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteActividad(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "profesionales";
const PATH = "/gestion/profesionales";

function fromForm(formData: FormData) {
  return {
    documento: formData.get("documento") || null,
    nombre: formData.get("nombre") || null,
    ciudad: formData.get("ciudad") || null,
    perfil: formData.get("perfil") || null,
    especialidad: formData.get("especialidad") || null,
    correo: formData.get("correo") || null,
    telefono: formData.get("telefono") || null,
    telefono_emergencia: formData.get("telefono_emergencia") || null,
    tarifa_hora: formData.get("tarifa_hora") || null,
    jornada: formData.get("jornada") || null,
    eps: formData.get("eps") || null,
    arl: formData.get("arl") || null,
    carpeta: formData.get("carpeta") || null,
    tipo_vinculo: formData.get("tipo_vinculo") || null,
    estado: formData.get("estado") || null,
    notas: formData.get("notas") || null,
  };
}

export async function createProfesional(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateProfesional(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteProfesional(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

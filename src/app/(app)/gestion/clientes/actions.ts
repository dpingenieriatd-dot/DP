"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "clientes";
const PATH = "/gestion/clientes";

function fromForm(formData: FormData) {
  return {
    codigo: formData.get("codigo") || null,
    nombre: formData.get("nombre") || null,
    tipo: formData.get("tipo") || null,
    sector: formData.get("sector") || null,
    nit: formData.get("nit") || null,
    contacto: formData.get("contacto") || null,
    telefono: formData.get("telefono") || null,
    correo: formData.get("correo") || null,
    ciudad: formData.get("ciudad") || null,
    estado: formData.get("estado") || null,
    notas: formData.get("notas") || null,
  };
}

export async function createCliente(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateCliente(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteCliente(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

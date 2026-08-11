"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "proveedores";
const PATH = "/gestion/proveedores";

function fromForm(formData: FormData) {
  return {
    nombre: formData.get("nombre") || null,
    nit: formData.get("nit") || null,
    contacto: formData.get("contacto") || null,
    telefono: formData.get("telefono") || null,
    correo: formData.get("correo") || null,
    ciudad: formData.get("ciudad") || null,
    forma_pago: formData.get("forma_pago") || null,
    estado: formData.get("estado") || null,
    notas: formData.get("notas") || null,
  };
}

export async function createProveedor(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function updateProveedor(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteProveedor(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

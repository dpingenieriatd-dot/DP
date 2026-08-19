"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/gestion/cotizaciones";
const BUCKET = "cotizacion-soportes";

export async function subirSoporte(cotizacionId: string, formData: FormData) {
  const file = formData.get("archivo") as File | null;
  if (!file || file.size === 0) return { error: "Selecciona un archivo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const path = `${cotizacionId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("cotizacion_soportes").insert({
    cotizacion_id: cotizacionId,
    nombre_archivo: file.name,
    storage_path: path,
    subido_por: user.id,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: error.message };
  }
  revalidatePath(PATH);
}

export async function eliminarSoporte(id: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from("cotizacion_soportes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

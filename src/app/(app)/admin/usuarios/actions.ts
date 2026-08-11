"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function actualizarPerfil(id: string, formData: FormData) {
  const supabase = await createClient();
  const modules = formData.getAll("modules") as string[];

  const { error } = await supabase
    .from("profiles")
    .update({
      role: formData.get("role") || "member",
      modules,
      cargo: formData.get("cargo") || null,
      capacidad_semanal_horas: formData.get("capacidad_semanal_horas") || 40,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
}

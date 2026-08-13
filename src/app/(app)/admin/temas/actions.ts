"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requiereAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: miPerfil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  return miPerfil?.role === "admin";
}

export async function actualizarTema(tema: string) {
  if (!(await requiereAdmin())) return { error: "Solo un administrador puede cambiar el tema." };

  const supabase = await createClient();
  const { error } = await supabase.from("app_config").update({ tema }).eq("id", 1);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
}

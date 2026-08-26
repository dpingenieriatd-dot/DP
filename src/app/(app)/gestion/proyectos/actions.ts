"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function archivarProyecto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("proyectos").update({ archivado: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gestion/proyectos");
}

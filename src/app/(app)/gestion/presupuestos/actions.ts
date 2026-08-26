"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function eliminarPresupuesto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("presupuestos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gestion/presupuestos");
}

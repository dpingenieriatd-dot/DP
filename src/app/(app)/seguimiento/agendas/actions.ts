"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/seguimiento/agendas";

export async function crearBloque(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_bloques").insert({
    usuario_id: formData.get("usuario_id"),
    dia: formData.get("dia"),
    hora_inicio: formData.get("hora_inicio"),
    horas: formData.get("horas") || 1,
    tarea: formData.get("tarea") || null,
    cliente: formData.get("cliente") || null,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
  revalidatePath("/seguimiento/capacidad");
}

export async function eliminarBloque(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_bloques").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
  revalidatePath("/seguimiento/capacidad");
}

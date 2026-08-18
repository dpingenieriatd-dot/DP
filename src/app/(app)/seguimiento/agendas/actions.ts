"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requiereAdmin } from "@/lib/auth";

const PATH = "/seguimiento/agendas";

export async function crearBloque(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("agenda_bloques").insert({
    usuario_id: formData.get("usuario_id"),
    dia: formData.get("dia"),
    hora_inicio: formData.get("hora_inicio"),
    horas: formData.get("horas") || 1,
    tarea: formData.get("tarea") || null,
    cliente_id: formData.get("cliente_id") || null,
    proyecto_id: formData.get("proyecto_id") || null,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
  revalidatePath("/seguimiento/capacidad");
}

/** Reprograma el bloque de una tarea a nueva fecha/hora — actualiza el mismo registro, nunca crea uno nuevo. */
export async function reprogramarBloque(tareaId: string, dia: string, horaInicio: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { data: tarea } = await supabase.from("tareas").select("responsable").eq("id", tareaId).single();
  if (!tarea || (tarea.responsable !== user.id && !(await requiereAdmin()))) {
    return { error: "Solo quien tomó la tarea puede reprogramarla." };
  }

  const { error } = await supabase.from("agenda_bloques").update({ dia, hora_inicio: horaInicio }).eq("tarea_id", tareaId);
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

/** El usuario confirmó el recordatorio ("Entendido") — no se vuelve a mostrar. */
export async function descartarRecordatorio(bloqueId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("agenda_bloques")
    .update({ recordatorio_estado: "descartado", recordatorio_snooze_hasta: null })
    .eq("id", bloqueId);
  if (error) return { error: error.message };
}

/** Posponer: vuelve a 'pendiente' (para poder re-reclamarse) y reaparece dentro de `minutos`. */
export async function posponerRecordatorio(bloqueId: string, minutos: number) {
  const supabase = await createClient();
  const hasta = new Date(Date.now() + minutos * 60_000).toISOString();
  const { error } = await supabase
    .from("agenda_bloques")
    .update({ recordatorio_estado: "pendiente", recordatorio_snooze_hasta: hasta })
    .eq("id", bloqueId);
  if (error) return { error: error.message };
}

/** Preferencia personal: cuántos minutos antes avisar, y si suena o no. */
export async function actualizarPreferenciasRecordatorio(minutosAntes: number, sonido: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { error } = await supabase.rpc("actualizar_preferencias_recordatorio", {
    p_minutos: minutosAntes,
    p_sonido: sonido,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

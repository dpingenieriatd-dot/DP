"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/seguimiento/tareas";

export async function crearTarea(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tareas").insert({
    titulo: formData.get("titulo"),
    cliente: formData.get("cliente") || null,
    prioridad: formData.get("prioridad") || "Media",
    fecha_limite: formData.get("fecha_limite") || null,
    horas_estimadas: formData.get("horas_estimadas") || null,
    descripcion: formData.get("descripcion") || null,
    publicado_por: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function tomarTarea(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { error } = await supabase
    .from("tareas")
    .update({
      responsable: user.id,
      estado: "En proceso",
      fecha_toma: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .eq("estado", "Disponible");
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function liberarTarea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tareas")
    .update({ responsable: null, estado: "Disponible", fecha_toma: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function terminarTarea(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tareas")
    .update({
      estado: "Terminada",
      avance_pct: 100,
      fecha_cierre: new Date().toISOString().slice(0, 10),
      entregable: formData.get("entregable") || null,
      notas: formData.get("notas") || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function eliminarTarea(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function iniciarTiempo(tareaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  // Solo un cronómetro activo por persona a la vez.
  await supabase
    .from("registros_tiempo")
    .update({ fin: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .is("fin", null);

  const { error } = await supabase.from("registros_tiempo").insert({
    tarea_id: tareaId,
    usuario_id: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function detenerTiempo(registroId: string) {
  const supabase = await createClient();
  const { data: registro, error: fetchError } = await supabase
    .from("registros_tiempo")
    .select("inicio, tarea_id")
    .eq("id", registroId)
    .single();
  if (fetchError || !registro) return { error: fetchError?.message || "No se encontró el registro." };

  const fin = new Date();
  const inicio = new Date(registro.inicio);
  const segundos = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 1000));

  const { error: updateError } = await supabase
    .from("registros_tiempo")
    .update({ fin: fin.toISOString(), duracion_segundos: segundos })
    .eq("id", registroId);
  if (updateError) return { error: updateError.message };

  const { data: tarea } = await supabase
    .from("tareas")
    .select("horas_reales")
    .eq("id", registro.tarea_id)
    .single();
  const nuevasHoras = Number(tarea?.horas_reales || 0) + segundos / 3600;
  await supabase.from("tareas").update({ horas_reales: nuevasHoras }).eq("id", registro.tarea_id);

  revalidatePath(PATH);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TABLE = "actividades";
const PATH = "/seguimiento/actividades";

function fromForm(formData: FormData) {
  return {
    fecha: formData.get("fecha") || new Date().toISOString().slice(0, 10),
    hora: formData.get("hora") || null,
    cargo: formData.get("cargo") || null,
    actividad: formData.get("actividad") || null,
    cliente_id: formData.get("cliente_id") || null,
    proyecto_id: formData.get("proyecto_id") || null,
    estado: formData.get("estado") || "Pendiente",
    observaciones: formData.get("observaciones") || null,
    respuesta: formData.get("respuesta") || null,
  };
}

export async function createActividad(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = fromForm(formData);
  const { data: creada, error } = await supabase
    .from(TABLE)
    .insert({ ...payload, origen: "Manual" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Si se indicó hora de inicio, crea/actualiza su bloque en Agenda (una persona registrando su propia
  // actividad — usuario_id de la actividad no siempre coincide con quien la registra, así que se usa el
  // usuario logueado, igual que el resto de bloques de Agenda).
  if (payload.hora && user) {
    const { error: agendaError } = await supabase.from("agenda_bloques").upsert(
      {
        actividad_id: creada.id,
        usuario_id: user.id,
        dia: payload.fecha,
        hora_inicio: payload.hora,
        horas: 1,
        tarea: payload.actividad,
        cliente_id: payload.cliente_id,
        proyecto_id: payload.proyecto_id,
      },
      { onConflict: "actividad_id" },
    );
    if (agendaError) return { error: agendaError.message };
    revalidatePath("/seguimiento/agendas");
    revalidatePath("/seguimiento/capacidad");
  }

  revalidatePath(PATH);
}

export async function updateActividad(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function deleteActividad(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

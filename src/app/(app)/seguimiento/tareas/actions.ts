"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crearNotificacion } from "@/lib/notificaciones";
import { requiereAdmin } from "@/lib/auth";

const PATH = "/seguimiento/tareas";

export async function crearTarea(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("tareas").insert({
    titulo: formData.get("titulo"),
    cliente_id: formData.get("cliente_id") || null,
    proyecto_id: formData.get("proyecto_id") || null,
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

  const { data: tarea } = await supabase.from("tareas").select("titulo, publicado_por").eq("id", id).single();

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

  if (tarea?.publicado_por && tarea.publicado_por !== user.id) {
    const { data: quien } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();
    await crearNotificacion(supabase, {
      usuarioId: tarea.publicado_por,
      tipo: "tarea_tomada",
      titulo: "Tomaron tu tarea",
      mensaje: `${quien?.full_name || quien?.email || "Alguien"} tomó "${tarea.titulo}"`,
      enlace: "/seguimiento/tareas",
    });
  }

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

  const { data: tarea } = await supabase.from("tareas").select("titulo, cliente_id, proyecto_id, responsable").eq("id", id).single();

  const entregable = (formData.get("entregable") as string) || null;
  const notas = (formData.get("notas") as string) || null;

  const { error } = await supabase
    .from("tareas")
    .update({
      estado: "Terminada",
      avance_pct: 100,
      fecha_cierre: new Date().toISOString().slice(0, 10),
      entregable,
      notas,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Registra el cierre en Actividades (bitácora de cumplimiento), sin que
  // haya que volver a digitarlo a mano — ver [[project-dp-ingenieria]] sobre
  // por qué antes quedaban desconectados.
  if (tarea) {
    let cargo: string | null = null;
    if (tarea.responsable) {
      const { data: perfil } = await supabase.from("profiles").select("cargo").eq("id", tarea.responsable).single();
      cargo = perfil?.cargo ?? null;
    }
    await supabase.from("actividades").insert({
      fecha: new Date().toISOString().slice(0, 10),
      usuario_id: tarea.responsable,
      cargo,
      actividad: tarea.titulo,
      cliente_id: tarea.cliente_id,
      proyecto_id: tarea.proyecto_id,
      estado: "Cumplido",
      observaciones: [entregable, notas].filter(Boolean).join(" — ") || null,
      origen: "Banco de tareas",
    });
  }

  revalidatePath(PATH);
  revalidatePath("/seguimiento/actividades");
}

export async function eliminarTarea(id: string) {
  if (!(await requiereAdmin())) return { error: "Solo la Directora de Proyectos puede eliminar tareas." };
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function archivarTarea(id: string) {
  if (!(await requiereAdmin())) return { error: "Solo la Directora de Proyectos puede archivar tareas." };
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").update({ archivado: true }).eq("id", id).eq("estado", "Terminada");
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function pausarTarea(registroId: string) {
  const resultado = await detenerTiempo(registroId);
  if (resultado?.error) return resultado;

  const supabase = await createClient();
  const { data: registro } = await supabase.from("registros_tiempo").select("tarea_id").eq("id", registroId).single();
  if (!registro) return { error: "No se encontró el registro." };

  const { error } = await supabase.from("tareas").update({ estado: "Pausada" }).eq("id", registro.tarea_id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function reanudarTarea(tareaId: string) {
  const resultado = await iniciarTiempo(tareaId);
  if (resultado?.error) return resultado;

  const supabase = await createClient();
  const { error } = await supabase.from("tareas").update({ estado: "En proceso" }).eq("id", tareaId);
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

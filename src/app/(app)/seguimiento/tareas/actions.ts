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

  const responsableId = (formData.get("responsable_id") as string) || null;
  const tituloTarea = formData.get("titulo") as string;
  const clienteId = (formData.get("cliente_id") as string) || null;
  const proyectoId = (formData.get("proyecto_id") as string) || null;
  const horasEstimadas = (formData.get("horas_estimadas") as string) || null;

  const { data: nueva, error } = await supabase
    .from("tareas")
    .insert({
      titulo: tituloTarea,
      cliente_id: clienteId,
      proyecto_id: proyectoId,
      empresa_atendida_id: formData.get("empresa_atendida_id") || null,
      prioridad: formData.get("prioridad") || "Media",
      fecha_limite: formData.get("fecha_limite") || null,
      horas_estimadas: horasEstimadas,
      descripcion: formData.get("descripcion") || null,
      instrucciones: formData.get("instrucciones") || null,
      entregable_requerido: formData.get("entregable_requerido") || null,
      entregable_soporte_url: formData.get("entregable_soporte_url") || null,
      notas_publicacion: formData.get("notas_publicacion") || null,
      publicado_por: user?.id ?? null,
      catalogo_actividad_id: formData.get("catalogo_actividad_id") || null,
      proceso_codigo: formData.get("proceso_codigo") || null,
      // Si se asigna un responsable desde la publicación, la tarea nace tomada por esa
      // persona (igual que si la hubiera tomado ella misma desde Disponibles).
      ...(responsableId
        ? { responsable: responsableId, estado: "En proceso", fecha_toma: new Date().toISOString().slice(0, 10) }
        : {}),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Misma lógica que tomarTarea: si queda asignada desde el inicio, se crea el bloque de
  // Agenda de una vez usando la fecha/hora de inicio indicadas en el formulario.
  if (responsableId && nueva) {
    const dia = (formData.get("fecha_inicio_agenda") as string) || new Date().toISOString().slice(0, 10);
    const horaInicio = (formData.get("hora_inicio_agenda") as string) || "08:00";
    const { error: agendaError } = await supabase.from("agenda_bloques").upsert(
      {
        tarea_id: nueva.id,
        usuario_id: responsableId,
        dia,
        hora_inicio: horaInicio,
        horas: Number(horasEstimadas) || 1,
        tarea: tituloTarea,
        cliente_id: clienteId,
        proyecto_id: proyectoId,
      },
      { onConflict: "tarea_id" },
    );
    if (agendaError) return { error: agendaError.message };
  }

  revalidatePath(PATH);
  revalidatePath("/seguimiento/agendas");
  revalidatePath("/seguimiento/capacidad");
}

export async function tomarTarea(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const dia = (formData.get("dia") as string) || new Date().toISOString().slice(0, 10);
  const horaInicio = (formData.get("hora_inicio") as string) || "08:00";

  const { data: tarea } = await supabase
    .from("tareas")
    .select("titulo, publicado_por, cliente_id, proyecto_id, horas_estimadas")
    .eq("id", id)
    .single();

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

  if (tarea) {
    const { error: agendaError } = await supabase.from("agenda_bloques").upsert(
      {
        tarea_id: id,
        usuario_id: user.id,
        dia,
        hora_inicio: horaInicio,
        horas: tarea.horas_estimadas || 1,
        tarea: tarea.titulo,
        cliente_id: tarea.cliente_id,
        proyecto_id: tarea.proyecto_id,
      },
      { onConflict: "tarea_id" },
    );
    if (agendaError) return { error: agendaError.message };
  }

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
  revalidatePath("/seguimiento/agendas");
  revalidatePath("/seguimiento/capacidad");
}

export async function liberarTarea(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  // "Retirar una tarea del Banco de tareas" es una acción administrativa salvo cuando es la
  // propia persona liberando su propia tarea (parte normal de "desarrollar" — tomarla y darse
  // cuenta de que no se puede continuar). Cualquier otro caso queda para admin únicamente.
  const { data: tarea } = await supabase.from("tareas").select("responsable").eq("id", id).single();
  const esPropia = tarea?.responsable === user.id;
  if (!esPropia && !(await requiereAdmin())) {
    return { error: "Solo puedes liberar una tarea que hayas tomado tú, o ser Directora de Proyectos." };
  }

  // Misma razón que en terminarTarea: si el cronómetro seguía corriendo, se cierra antes de
  // soltar la tarea para no dejar un registro de tiempo abierto para siempre.
  const { data: abiertos } = await supabase.from("registros_tiempo").select("id").eq("tarea_id", id).is("fin", null);
  for (const registro of abiertos ?? []) {
    await detenerTiempo(registro.id);
  }

  const { error } = await supabase
    .from("tareas")
    .update({ responsable: null, estado: "Disponible", fecha_toma: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function terminarTarea(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const { data: tarea } = await supabase.from("tareas").select("titulo, cliente_id, proyecto_id, responsable").eq("id", id).single();
  if (!tarea || (tarea.responsable !== user.id && !(await requiereAdmin()))) {
    return { error: "Solo quien tomó la tarea puede terminarla." };
  }

  const entregable = (formData.get("entregable") as string) || null;
  const notas = (formData.get("notas") as string) || null;

  // Si el cronómetro seguía corriendo (se terminó la tarea sin pasar por "Pausar" antes), se
  // cierra aquí para que el tiempo de esa última sesión también quede consolidado — si no, ese
  // registro quedaría abierto para siempre y "Cronómetro activo" seguiría apareciendo para una
  // tarea ya Terminada.
  const { data: abiertos } = await supabase.from("registros_tiempo").select("id").eq("tarea_id", id).is("fin", null);
  for (const registro of abiertos ?? []) {
    await detenerTiempo(registro.id);
  }

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

const CALIDAD_VALIDA = [20, 40, 60, 80, 100];

/** Calificación de calidad del entregable (1-5 -> 20/40/60/80/100), solo sobre tareas Terminadas, solo admin. */
export async function calificarCalidad(id: string, calidad: number) {
  if (!(await requiereAdmin())) return { error: "Solo la Directora de Proyectos puede calificar la calidad del entregable." };
  if (!CALIDAD_VALIDA.includes(calidad)) return { error: "Calificación inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("tareas").update({ calidad_pct: calidad }).eq("id", id).eq("estado", "Terminada");
  if (error) return { error: error.message };
  revalidatePath(PATH);
  revalidatePath("/seguimiento/efectividad");
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
  // La calidad se califica "antes de archivar" (pedido explícito de Angélica) — sin calificar, no se
  // deja archivar, para que ninguna tarea terminada se salte la revisión de calidad en silencio.
  const { data: tarea } = await supabase.from("tareas").select("calidad_pct").eq("id", id).single();
  if (tarea?.calidad_pct == null) return { error: "Califica la calidad del entregable antes de archivar la tarea." };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  // Pasa a "En proceso" primero: iniciarTiempo exige que la tarea ya esté en ese estado.
  const { error: estadoError } = await supabase
    .from("tareas")
    .update({ estado: "En proceso" })
    .eq("id", tareaId)
    .eq("estado", "Pausada")
    .eq("responsable", user.id);
  if (estadoError) return { error: estadoError.message };

  const resultado = await iniciarTiempo(tareaId);
  if (resultado?.error) return resultado;
  revalidatePath(PATH);
}

export async function iniciarTiempo(tareaId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  // El cronómetro solo se activa sobre una tarea que el usuario haya tomado y que esté En proceso.
  const { data: tarea } = await supabase.from("tareas").select("estado, responsable").eq("id", tareaId).single();
  if (!tarea || tarea.responsable !== user.id || tarea.estado !== "En proceso") {
    return { error: "El cronómetro solo se puede activar sobre una tarea que hayas tomado y que esté En proceso." };
  }

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

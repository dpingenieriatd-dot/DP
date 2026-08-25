"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * "+ Agregar actividad faltante al catálogo" (Banco de tareas / Actividades): cualquiera con
 * acceso a Seguimiento puede sumar una actividad personalizada al catálogo de procesos para
 * poder publicarla/registrarla ya enlazada, sin esperar a que un admin la precargue.
 */
export async function agregarActividadCatalogo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const codigo = formData.get("proceso_codigo") as string;
  const subproceso = (formData.get("subproceso") as string)?.trim();
  if (!codigo) return { error: "Selecciona el proceso al que pertenece la actividad." };
  if (!subproceso) return { error: "Escribe el nombre de la actividad." };

  const { data, error } = await supabase
    .from("catalogo_actividades")
    .insert({ codigo, subproceso, personalizada: true, creada_por: user?.id ?? null })
    .select("id, codigo, subproceso, descripcion, responsable_sugerido")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/seguimiento/tareas");
  revalidatePath("/seguimiento/actividades");
  revalidatePath("/seguimiento/procesos");
  return { data };
}

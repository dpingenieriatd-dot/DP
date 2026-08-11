"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PATH = "/gestion/cotizaciones";

export async function crearCotizacion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("cotizaciones").insert({
    codigo: formData.get("codigo") || null,
    cliente_id: formData.get("cliente_id") || null,
    nombre: formData.get("nombre"),
    valor_total: formData.get("valor_total") || 0,
    creado_por: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function actualizarCotizacion(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cotizaciones")
    .update({
      codigo: formData.get("codigo") || null,
      cliente_id: formData.get("cliente_id") || null,
      nombre: formData.get("nombre"),
      valor_total: formData.get("valor_total") || 0,
      estado: formData.get("estado") || "Borrador",
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function eliminarCotizacion(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cotizaciones").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function aprobarYCrearProyecto(cotizacion: { id: string; codigo: string | null; nombre: string; cliente_id: string | null; valor_total: number }) {
  const supabase = await createClient();

  await supabase.from("cotizaciones").update({ estado: "Aprobada" }).eq("id", cotizacion.id);

  const { data: proyecto, error } = await supabase
    .from("proyectos")
    .insert({
      codigo: cotizacion.codigo,
      nombre: cotizacion.nombre,
      cliente_id: cotizacion.cliente_id,
      cotizacion_id: cotizacion.id,
      contrato_valor: cotizacion.valor_total,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(PATH);
  revalidatePath("/gestion/proyectos");
  redirect(`/gestion/proyectos/${proyecto.id}`);
}

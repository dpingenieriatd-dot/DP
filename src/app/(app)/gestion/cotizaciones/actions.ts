"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularCotizacion } from "@/lib/finance";

const PATH = "/gestion/cotizaciones";

function inputsFromForm(formData: FormData) {
  return {
    personas: Number(formData.get("personas") || 0),
    valor_unit: Number(formData.get("valor_unit") || 0),
    horas: Number(formData.get("horas") || 0),
    valor_hora: Number(formData.get("valor_hora") || 0),
  };
}

export async function crearCotizacion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inputs = inputsFromForm(formData);
  const calc = calcularCotizacion(inputs);

  const { error } = await supabase.from("cotizaciones").insert({
    codigo: formData.get("codigo") || null,
    cliente_id: formData.get("cliente_id") || null,
    empresa_id: formData.get("empresa_id") || null,
    nombre: formData.get("nombre"),
    responsable_id: formData.get("responsable_id") || null,
    fecha: formData.get("fecha") || new Date().toISOString().slice(0, 10),
    personas: calc.personas,
    valor_unit: calc.valorUnit,
    val_materiales: calc.valMateriales,
    horas: calc.horas,
    valor_hora: calc.valorHora,
    valor_prof: calc.valorProf,
    valor_cotizado: calc.valorCotizado,
    creado_por: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function actualizarCotizacion(id: string, formData: FormData) {
  const supabase = await createClient();
  const inputs = inputsFromForm(formData);
  const calc = calcularCotizacion(inputs);

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      codigo: formData.get("codigo") || null,
      cliente_id: formData.get("cliente_id") || null,
      empresa_id: formData.get("empresa_id") || null,
      nombre: formData.get("nombre"),
      responsable_id: formData.get("responsable_id") || null,
      fecha: formData.get("fecha") || null,
      personas: calc.personas,
      valor_unit: calc.valorUnit,
      val_materiales: calc.valMateriales,
      horas: calc.horas,
      valor_hora: calc.valorHora,
      valor_prof: calc.valorProf,
      valor_cotizado: calc.valorCotizado,
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

/**
 * Aprobar crea el Proyecto Y un primer Presupuesto sembrado con los
 * componentes de la cotización (materiales + profesional) como costo
 * inicial. Ese presupuesto luego se ajusta con costos reales en el
 * módulo Presupuestos — la cotización nunca cambia, es la oferta fija
 * que se le hizo al cliente.
 */
export async function aprobarYCrearProyecto(cotizacionId: string) {
  const supabase = await createClient();

  const { data: cot, error: fetchError } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("id", cotizacionId)
    .single();
  if (fetchError || !cot) return { error: fetchError?.message || "No se encontró la cotización." };

  await supabase.from("cotizaciones").update({ estado: "Aprobada" }).eq("id", cotizacionId);

  const { data: proyecto, error: proyError } = await supabase
    .from("proyectos")
    .insert({
      codigo: cot.codigo,
      nombre: cot.nombre,
      cliente_id: cot.cliente_id,
      empresa_id: cot.empresa_id,
      responsable_id: cot.responsable_id,
      cotizacion_id: cot.id,
    })
    .select("id")
    .single();
  if (proyError) return { error: proyError.message };

  const costosSemilla = Number(cot.val_materiales || 0) + Number(cot.valor_prof || 0);
  const { error: preError } = await supabase.from("presupuestos").insert({
    proyecto_id: proyecto.id,
    cotizacion_id: cot.id,
    codigo: cot.codigo,
    nombre: cot.nombre,
    empresa_id: cot.empresa_id,
    costos: costosSemilla,
    valor_cotizado: cot.valor_cotizado,
  });
  if (preError) return { error: preError.message };

  revalidatePath(PATH);
  revalidatePath("/gestion/proyectos");
  revalidatePath("/gestion/presupuestos");
  redirect(`/gestion/proyectos/${proyecto.id}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularCotizacion, calcularPresupuesto } from "@/lib/finance";
import { crearNotificacion } from "@/lib/notificaciones";

const PATH = "/gestion/cotizaciones";

function inputsFromForm(formData: FormData) {
  return {
    personas: Number(formData.get("personas") || 0),
    valor_unit: Number(formData.get("valor_unit") || 0),
    horas: Number(formData.get("horas") || 0),
    valor_hora: Number(formData.get("valor_hora") || 0),
  };
}

/**
 * Corre el mismo motor de rentabilidad que Presupuestos, pero ANTES de
 * aceptar la cotización — así lo exige la orden de compra ("antes de
 * aceptarlo, mostrando costos, márgenes y precio recomendado").
 *
 * Si todavía no se cargó un costo estimado real (costosEstimados <= 0),
 * NO se recalcula valor_sugerido/margen: se dejan en null (o, al editar,
 * se dejan como estaban) para no pisar en $0 un valor histórico migrado
 * solo porque alguien abrió y guardó la cotización sin llenar ese campo.
 */
function rentabilidadFromForm(formData: FormData, valorCotizado: number) {
  const costosEstimados = Number(formData.get("costos_estimados") || 0);
  const respIva = formData.get("resp_iva") === "true";
  if (costosEstimados <= 0) {
    return { costosEstimados: null, respIva, valorSugerido: undefined, margenNeg: undefined };
  }
  const f = calcularPresupuesto({
    costos: costosEstimados,
    admin_pct: 15,
    margen_pct: 30,
    resp_iva: respIva,
    iva_pct: 19,
    valor_cotizado: valorCotizado,
  });
  return { costosEstimados, respIva, valorSugerido: f.valorSugerido, margenNeg: f.margenNeg };
}

export async function crearCotizacion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inputs = inputsFromForm(formData);
  const calc = calcularCotizacion(inputs);
  const rent = rentabilidadFromForm(formData, calc.valorCotizado);

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
    costos_estimados: rent.costosEstimados,
    resp_iva: rent.respIva,
    ...(rent.valorSugerido !== undefined ? { valor_sugerido: rent.valorSugerido, margen: rent.margenNeg } : {}),
    creado_por: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function actualizarCotizacion(id: string, formData: FormData) {
  const supabase = await createClient();
  const inputs = inputsFromForm(formData);
  const calc = calcularCotizacion(inputs);
  const rent = rentabilidadFromForm(formData, calc.valorCotizado);
  const nuevoEstado = (formData.get("estado") as string) || "Borrador";

  const { data: previa } = await supabase.from("cotizaciones").select("estado, creado_por, nombre").eq("id", id).single();

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
      costos_estimados: rent.costosEstimados,
      resp_iva: rent.respIva,
      ...(rent.valorSugerido !== undefined ? { valor_sugerido: rent.valorSugerido, margen: rent.margenNeg } : {}),
      estado: nuevoEstado,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  if (previa && previa.estado !== nuevoEstado && (nuevoEstado === "Aprobada" || nuevoEstado === "Rechazada")) {
    await crearNotificacion(supabase, {
      usuarioId: previa.creado_por,
      tipo: "cotizacion_estado",
      titulo: `Cotización ${nuevoEstado.toLowerCase()}`,
      mensaje: previa.nombre,
      enlace: "/gestion/cotizaciones",
    });
  }

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

  // Si ya se estimaron costos internos reales al cotizar, se usan tal cual
  // (es la fuente más confiable). Si no, se cae al viejo estimado grueso
  // (materiales + profesional cobrado) para no dejar el presupuesto en cero.
  const costosSemilla =
    cot.costos_estimados != null && Number(cot.costos_estimados) > 0
      ? Number(cot.costos_estimados)
      : Number(cot.val_materiales || 0) + Number(cot.valor_prof || 0);
  const { error: preError } = await supabase.from("presupuestos").insert({
    proyecto_id: proyecto.id,
    cotizacion_id: cot.id,
    codigo: cot.codigo,
    nombre: cot.nombre,
    empresa_id: cot.empresa_id,
    costos: costosSemilla,
    resp_iva: cot.resp_iva ?? true,
    valor_cotizado: cot.valor_cotizado,
  });
  if (preError) return { error: preError.message };

  revalidatePath(PATH);
  revalidatePath("/gestion/proyectos");
  revalidatePath("/gestion/presupuestos");
  redirect(`/gestion/proyectos/${proyecto.id}`);
}

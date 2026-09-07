"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/gestion/compras";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Código consecutivo simple (COM-0001, COM-0002...) — solo informativo, no se edita a mano. */
async function generarCodigoCompra(supabase: SupabaseServer): Promise<string> {
  const prefix = "COM-";
  const { data } = await supabase.from("compras").select("codigo").not("codigo", "is", null).ilike("codigo", `${prefix}%`);
  const usados = (data ?? [])
    .map((c) => Number(c.codigo?.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefix}${String(siguiente).padStart(4, "0")}`;
}

function fromForm(formData: FormData) {
  return {
    proyecto_id: formData.get("proyecto_id") || null,
    presupuesto_id: formData.get("presupuesto_id") || null,
    presupuesto_costo_id: formData.get("presupuesto_costo_id") || null,
    proveedor_id: formData.get("proveedor_id") || null,
    insumo_id: formData.get("insumo_id") || null,
    fecha: formData.get("fecha") || new Date().toISOString().slice(0, 10),
    descripcion: formData.get("descripcion") || null,
    servicio: formData.get("servicio") || null,
    cantidad: formData.get("cantidad") || 1,
    valor_unitario: formData.get("valor_unitario") || 0,
    valor_pagado: formData.get("valor_pagado") || 0,
    estado_pago: formData.get("estado_pago") || "Cotizado",
    referencia: formData.get("referencia") || null,
    categoria: formData.get("categoria") || null,
    notas: formData.get("notas") || null,
  };
}

function revalidateAll(proyectoId: FormDataEntryValue | null) {
  revalidatePath(PATH);
  revalidatePath("/gestion/proyectos");
  revalidatePath("/gestion/presupuestos");
  if (proyectoId) revalidatePath(`/gestion/proyectos/${proyectoId}`);
}

/** El proyecto es el centro de costos — sin él, la compra no se puede vincular al control de costos del presupuesto. */
function validarCampos(formData: FormData) {
  if (!formData.get("proyecto_id")) return "Selecciona el proyecto al que pertenece esta compra.";
  if (!String(formData.get("descripcion") || "").trim()) return "Escribe la descripción del producto o servicio.";
  return null;
}

/**
 * Deduce el presupuesto de la compra:
 *  - si se eligió una línea del plan, el presupuesto es el de esa línea (manda);
 *  - si no, el que se haya elegido a mano;
 *  - si no, y el proyecto tiene un solo presupuesto, ese.
 */
async function resolverPresupuestoId(supabase: SupabaseServer, datos: ReturnType<typeof fromForm>) {
  if (datos.presupuesto_costo_id) {
    const { data } = await supabase.from("presupuesto_costos").select("presupuesto_id").eq("id", datos.presupuesto_costo_id).single();
    if (data?.presupuesto_id) return data.presupuesto_id;
  }
  if (datos.presupuesto_id) return datos.presupuesto_id;
  if (!datos.proyecto_id) return null;
  const { data } = await supabase.from("presupuestos").select("id").eq("proyecto_id", datos.proyecto_id);
  return data && data.length === 1 ? data[0].id : null;
}

export async function crearCompra(formData: FormData) {
  const errorCampos = validarCampos(formData);
  if (errorCampos) return { error: errorCampos };
  const supabase = await createClient();
  const codigo = await generarCodigoCompra(supabase);
  const datos = fromForm(formData);
  datos.presupuesto_id = await resolverPresupuestoId(supabase, datos);
  const { error } = await supabase.from("compras").insert({ ...datos, codigo });
  if (error) return { error: error.message };
  revalidateAll(formData.get("proyecto_id"));
}

export async function actualizarCompra(id: string, formData: FormData) {
  const errorCampos = validarCampos(formData);
  if (errorCampos) return { error: errorCampos };
  const supabase = await createClient();
  const datos = fromForm(formData);
  datos.presupuesto_id = await resolverPresupuestoId(supabase, datos);
  const { error } = await supabase.from("compras").update(datos).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll(formData.get("proyecto_id"));
}

export async function archivarCompra(id: string) {
  const supabase = await createClient();
  const { data: compra } = await supabase.from("compras").select("proyecto_id").eq("id", id).single();
  const { error } = await supabase.from("compras").update({ archivado: true }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll(compra?.proyecto_id ?? null);
}

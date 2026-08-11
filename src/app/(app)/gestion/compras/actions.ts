"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/gestion/compras";

function fromForm(formData: FormData) {
  return {
    proyecto_id: formData.get("proyecto_id") || null,
    proveedor_id: formData.get("proveedor_id") || null,
    insumo_id: formData.get("insumo_id") || null,
    fecha: formData.get("fecha") || new Date().toISOString().slice(0, 10),
    unidad: formData.get("unidad") || null,
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

export async function crearCompra(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("compras").insert(fromForm(formData));
  if (error) return { error: error.message };
  revalidateAll(formData.get("proyecto_id"));
}

export async function actualizarCompra(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("compras").update(fromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll(formData.get("proyecto_id"));
}

export async function eliminarCompra(id: string) {
  const supabase = await createClient();
  const { data: compra } = await supabase.from("compras").select("proyecto_id").eq("id", id).single();
  const { error } = await supabase.from("compras").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll(compra?.proyecto_id ?? null);
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function ruta(id: string) {
  return `/gestion/presupuestos/${id}`;
}

export async function actualizarPresupuesto(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("presupuestos")
    .update({
      nombre: formData.get("nombre"),
      costos: formData.get("costos") || 0,
      admin_pct: formData.get("admin_pct") || 15,
      margen_pct: formData.get("margen_pct") || 30,
      resp_iva: formData.get("resp_iva") === "on",
      iva_pct: formData.get("iva_pct") || 19,
      valor_cotizado: formData.get("valor_cotizado") || 0,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(ruta(id));
  revalidatePath("/gestion/presupuestos");
}

export async function agregarCosto(presupuestoId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("presupuesto_costos").insert({
    presupuesto_id: presupuestoId,
    categoria: formData.get("categoria") || "Otros costos",
    descripcion: formData.get("descripcion") || null,
    proveedor: formData.get("proveedor") || null,
    presupuestado: formData.get("presupuestado") || 0,
    real: formData.get("real") || 0,
    estado: formData.get("estado") || "Planeado",
    origen: "Manual",
  });
  if (error) return { error: error.message };
  revalidatePath(ruta(presupuestoId));
  revalidatePath("/gestion/presupuestos");
}

export async function actualizarCosto(presupuestoId: string, costoId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("presupuesto_costos")
    .update({
      categoria: formData.get("categoria") || "Otros costos",
      descripcion: formData.get("descripcion") || null,
      proveedor: formData.get("proveedor") || null,
      presupuestado: formData.get("presupuestado") || 0,
      real: formData.get("real") || 0,
      estado: formData.get("estado") || "Planeado",
    })
    .eq("id", costoId);
  if (error) return { error: error.message };
  revalidatePath(ruta(presupuestoId));
  revalidatePath("/gestion/presupuestos");
}

export async function eliminarCosto(presupuestoId: string, costoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("presupuesto_costos").delete().eq("id", costoId);
  if (error) return { error: error.message };
  revalidatePath(ruta(presupuestoId));
  revalidatePath("/gestion/presupuestos");
}

/**
 * "Restaurar base": vuelve a traer los ítems originales de la cotización aprobada
 * (materiales + profesional) tal como quedaron sembrados al crear el proyecto.
 * Solo toca las filas marcadas origen="Presupuesto" (las que sembró
 * aprobarYCrearProyecto) — si el usuario editó el valor presupuestado de una de
 * esas filas, o la eliminó, esto la repone con el valor vigente de la cotización.
 * No toca costos manuales ni importados de Compras.
 */
export async function restaurarBase(presupuestoId: string) {
  const supabase = await createClient();
  const { data: presupuesto } = await supabase.from("presupuestos").select("cotizacion_id").eq("id", presupuestoId).single();
  if (!presupuesto?.cotizacion_id) return { error: "Este presupuesto no está vinculado a ninguna cotización." };

  const { data: cot } = await supabase.from("cotizaciones").select("val_materiales, valor_prof").eq("id", presupuesto.cotizacion_id).single();
  if (!cot) return { error: "No se encontró la cotización base." };

  const { error: delError } = await supabase.from("presupuesto_costos").delete().eq("presupuesto_id", presupuestoId).eq("origen", "Presupuesto");
  if (delError) return { error: delError.message };

  const items = [
    Number(cot.val_materiales) > 0 && {
      presupuesto_id: presupuestoId,
      categoria: "Materiales / desgaste",
      descripcion: "Materiales (de la cotización)",
      presupuestado: Number(cot.val_materiales),
      origen: "Presupuesto",
    },
    Number(cot.valor_prof) > 0 && {
      presupuesto_id: presupuestoId,
      categoria: "Servicios / profesionales",
      descripcion: "Profesional (de la cotización)",
      presupuestado: Number(cot.valor_prof),
      origen: "Presupuesto",
    },
  ].filter(Boolean);

  if (items.length === 0) return { error: "La cotización base no tiene materiales ni profesional para restaurar." };

  const { error } = await supabase.from("presupuesto_costos").insert(items);
  if (error) return { error: error.message };
  revalidatePath(ruta(presupuestoId));
  revalidatePath("/gestion/presupuestos");
}

/**
 * Trae las compras del proyecto como líneas de costo. Solo importa las que
 * todavía no se habían traído (compra_id no repetido) — se puede volver a
 * usar después de registrar compras nuevas sin duplicar las que ya estaban.
 */
export async function importarDesdeCompras(presupuestoId: string, proyectoId: string) {
  const supabase = await createClient();
  const [{ data: compras }, { data: yaImportadas }] = await Promise.all([
    supabase.from("compras").select("*, proveedores(nombre), insumos(descripcion)").eq("proyecto_id", proyectoId),
    supabase.from("presupuesto_costos").select("compra_id").eq("presupuesto_id", presupuestoId).not("compra_id", "is", null),
  ]);

  if (!compras || compras.length === 0) return { error: "Este proyecto no tiene compras registradas todavía." };

  const idsImportados = new Set((yaImportadas ?? []).map((c) => c.compra_id));
  const nuevas = compras.filter((c) => !idsImportados.has(c.id));
  if (nuevas.length === 0) return { error: "Ya se importaron todas las compras de este proyecto — no hay ninguna nueva." };

  const filas = nuevas.map((c) => ({
    presupuesto_id: presupuestoId,
    compra_id: c.id,
    categoria: c.categoria === "Servicios profesionales" ? "Servicios / profesionales" : "Compras / insumos",
    descripcion: c.insumos?.descripcion || c.categoria || "Costo del proyecto",
    proveedor: c.proveedores?.nombre || null,
    presupuestado: Number(c.cantidad) * Number(c.valor_unitario),
    real: c.estado_pago === "Pagado" ? Number(c.cantidad) * Number(c.valor_unitario) : 0,
    estado: c.estado_pago === "Pagado" ? "Pagado" : c.estado_pago === "Aprobado" ? "Aprobado" : "Cotizado",
    origen: "Compra",
  }));

  const { error } = await supabase.from("presupuesto_costos").insert(filas);
  if (error) return { error: error.message };
  revalidatePath(ruta(presupuestoId));
  revalidatePath("/gestion/presupuestos");
}

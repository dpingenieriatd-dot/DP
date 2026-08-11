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

/** Trae las compras ya registradas del proyecto como líneas de costo iniciales. */
export async function importarDesdeCompras(presupuestoId: string, proyectoId: string) {
  const supabase = await createClient();
  const { data: compras } = await supabase
    .from("compras")
    .select("*, proveedores(nombre), insumos(descripcion)")
    .eq("proyecto_id", proyectoId);

  if (!compras || compras.length === 0) return { error: "Este proyecto no tiene compras registradas todavía." };

  const filas = compras.map((c) => ({
    presupuesto_id: presupuestoId,
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

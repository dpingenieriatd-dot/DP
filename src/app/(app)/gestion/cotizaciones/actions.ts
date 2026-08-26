"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularCotizacionItems, type ItemCotizacion } from "@/lib/finance";
import { crearNotificacion } from "@/lib/notificaciones";

const PATH = "/gestion/cotizaciones";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type ItemPayload = {
  tipo: "insumo" | "profesional" | "material";
  descripcion: string;
  unidad: string;
  cantidad: number;
  costo_unitario: number;
  precio_cliente_override: number | null;
};

export type CotizacionPayload = {
  codigo: string;
  cliente_id: string;
  empresa_id: string;
  nombre: string;
  responsable_id: string | null;
  fecha: string;
  estado: string;
  personas: number;
  vigencia_dias: number;
  contacto: string;
  correo_contacto: string;
  telefono_contacto: string;
  resp_iva: boolean;
  seguimiento_interno: string;
  admin_pct: number;
  margen_pct: number;
  descripcion_cliente: string;
  forma_pago: string;
  condiciones_cliente: string;
  items: ItemPayload[];
};

/**
 * El select de "Empresa atendida" también permite elegir un Cliente directamente
 * (cuando la empresa atendida ES el cliente, sin intermediario) — llega como
 * "cliente:<id>". empresa_id sigue siendo una FK real a empresas_atendidas, así
 * que se busca (o se crea) la fila correspondiente para ese cliente.
 */
async function resolveEmpresaId(supabase: SupabaseServer, raw: string): Promise<string | null> {
  if (!raw) return null;
  if (!raw.startsWith("cliente:")) return raw;

  const clienteId = raw.slice("cliente:".length);
  const { data: cliente } = await supabase.from("clientes").select("nombre, nit, ciudad").eq("id", clienteId).single();
  if (!cliente) return null;

  const { data: existente } = await supabase
    .from("empresas_atendidas")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("nombre", cliente.nombre)
    .maybeSingle();
  if (existente) return existente.id;

  const { data: nueva, error } = await supabase
    .from("empresas_atendidas")
    .insert({ nombre: cliente.nombre, cliente_id: clienteId, nit: cliente.nit, ciudad: cliente.ciudad, estado: "Activo" })
    .select("id")
    .single();
  if (error || !nueva) return null;
  return nueva.id;
}

/** El código no se puede reusar ni siquiera si la cotización que lo tenía ya se borró o le cambiaron el código (migration_25). */
async function codigoLiberado(supabase: SupabaseServer, codigo: string) {
  const { data } = await supabase.from("cotizaciones_codigos_usados").select("codigo").eq("codigo", codigo).maybeSingle();
  return !!data;
}

/** El código de cotización es único a nivel de base de datos — mensaje legible en vez del error crudo de Postgres. */
function codigoDuplicado(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Ya existe una cotización con este código. Usa un código diferente.";
  return error.message;
}

function itemsParaCalculo(items: ItemPayload[]): ItemCotizacion[] {
  return items.map((i) => ({
    cantidad: Number(i.cantidad || 0),
    costo_unitario: Number(i.costo_unitario || 0),
    precio_cliente_override: i.precio_cliente_override,
  }));
}

/** Reemplaza por completo los ítems de la cotización (igual que el HTML: los ítems viven en el borrador y se graban todos juntos al guardar). */
async function reemplazarItems(supabase: SupabaseServer, cotizacionId: string, items: ItemPayload[]) {
  await supabase.from("cotizacion_items").delete().eq("cotizacion_id", cotizacionId);
  if (!items.length) return null;
  const { error } = await supabase.from("cotizacion_items").insert(
    items.map((i, idx) => ({
      cotizacion_id: cotizacionId,
      tipo: i.tipo,
      descripcion: i.descripcion,
      unidad: i.unidad,
      cantidad: i.cantidad,
      costo_unitario: i.costo_unitario,
      precio_cliente_override: i.precio_cliente_override,
      orden: idx,
    }))
  );
  return error;
}

export async function crearCotizacion(payload: CotizacionPayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const codigo = payload.codigo.trim();
  if (!codigo) return { error: "Ingresa manualmente el código / consecutivo de la cotización." };
  if (await codigoLiberado(supabase, codigo)) {
    return { error: "Ya existe una cotización con este código. Usa un código diferente." };
  }
  if (!payload.items.length) return { error: "Agrega al menos un ítem a la cotización." };

  const calc = calcularCotizacionItems(itemsParaCalculo(payload.items), {
    admin_pct: payload.admin_pct,
    margen_pct: payload.margen_pct,
    resp_iva: payload.resp_iva,
    iva_pct: 19,
  });
  const empresaId = await resolveEmpresaId(supabase, payload.empresa_id);

  const { data: nueva, error } = await supabase
    .from("cotizaciones")
    .insert({
      codigo,
      cliente_id: payload.cliente_id || null,
      empresa_id: empresaId,
      nombre: payload.nombre,
      responsable_id: payload.responsable_id || null,
      fecha: payload.fecha || new Date().toISOString().slice(0, 10),
      estado: payload.estado,
      personas: payload.personas,
      vigencia_dias: payload.vigencia_dias,
      contacto: payload.contacto,
      correo_contacto: payload.correo_contacto,
      telefono_contacto: payload.telefono_contacto,
      seguimiento_interno: payload.seguimiento_interno,
      descripcion_cliente: payload.descripcion_cliente,
      forma_pago: payload.forma_pago,
      condiciones_cliente: payload.condiciones_cliente,
      resp_iva: payload.resp_iva,
      margen_pct: payload.margen_pct,
      admin_pct: payload.admin_pct,
      costos_estimados: calc.direct,
      valor_cotizado: calc.clientTotal,
      valor_sugerido: calc.sugerido,
      creado_por: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error || !nueva) return { error: codigoDuplicado(error!) };

  const itemsError = await reemplazarItems(supabase, nueva.id, payload.items);
  if (itemsError) return { error: itemsError.message };

  revalidatePath(PATH);
  return { id: nueva.id };
}

export async function actualizarCotizacion(id: string, payload: CotizacionPayload) {
  const supabase = await createClient();

  const codigo = payload.codigo.trim();
  if (!codigo) return { error: "Ingresa manualmente el código / consecutivo de la cotización." };
  if (!payload.items.length) return { error: "Agrega al menos un ítem a la cotización." };

  const { data: previa } = await supabase.from("cotizaciones").select("estado, creado_por, nombre, codigo").eq("id", id).single();
  if (codigo !== previa?.codigo && (await codigoLiberado(supabase, codigo))) {
    return { error: "Ya existe una cotización con este código. Usa un código diferente." };
  }

  const calc = calcularCotizacionItems(itemsParaCalculo(payload.items), {
    admin_pct: payload.admin_pct,
    margen_pct: payload.margen_pct,
    resp_iva: payload.resp_iva,
    iva_pct: 19,
  });
  const empresaId = await resolveEmpresaId(supabase, payload.empresa_id);

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      codigo,
      cliente_id: payload.cliente_id || null,
      empresa_id: empresaId,
      nombre: payload.nombre,
      responsable_id: payload.responsable_id || null,
      fecha: payload.fecha || null,
      estado: payload.estado,
      personas: payload.personas,
      vigencia_dias: payload.vigencia_dias,
      contacto: payload.contacto,
      correo_contacto: payload.correo_contacto,
      telefono_contacto: payload.telefono_contacto,
      seguimiento_interno: payload.seguimiento_interno,
      descripcion_cliente: payload.descripcion_cliente,
      forma_pago: payload.forma_pago,
      condiciones_cliente: payload.condiciones_cliente,
      resp_iva: payload.resp_iva,
      margen_pct: payload.margen_pct,
      admin_pct: payload.admin_pct,
      costos_estimados: calc.direct,
      valor_cotizado: calc.clientTotal,
      valor_sugerido: calc.sugerido,
    })
    .eq("id", id);
  if (error) return { error: codigoDuplicado(error) };

  const itemsError = await reemplazarItems(supabase, id, payload.items);
  if (itemsError) return { error: itemsError.message };

  if (previa && previa.estado !== payload.estado && (payload.estado === "Aprobada" || payload.estado === "Rechazada")) {
    await crearNotificacion(supabase, {
      usuarioId: previa.creado_por,
      tipo: "cotizacion_estado",
      titulo: `Cotización ${payload.estado.toLowerCase()}`,
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
 * Código consecutivo y ascendente por año, ejemplo PROY-2026-001, como pide el
 * documento de ajustes — el proyecto creado al aprobar una cotización no
 * reusa el código de la cotización (COT-xxx), tiene su propia numeración.
 * Mira el máximo consecutivo ya usado ese año (sea que haya salido de aquí o
 * de la creación manual de proyectos) y sigue de ahí.
 */
async function generarCodigoProyecto(supabase: SupabaseServer): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PROY-${year}-`;
  const { data } = await supabase.from("proyectos").select("codigo").ilike("codigo", `${prefix}%`);
  const usados = (data ?? [])
    .filter((p) => p.codigo?.startsWith(prefix))
    .map((p) => Number(p.codigo?.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefix}${String(siguiente).padStart(3, "0")}`;
}

const CATEGORIA_POR_TIPO: Record<string, string> = {
  insumo: "Compras / insumos",
  profesional: "Servicios / profesionales",
  material: "Materiales / desgaste",
};

/**
 * Aprobar crea el Proyecto Y un primer Presupuesto sembrado con los ítems de
 * la cotización como costo inicial (uno por ítem, mismo tipo/descripción).
 * Ese presupuesto luego se ajusta con costos reales en el módulo
 * Presupuestos — la cotización nunca cambia, es la oferta fija que se le
 * hizo al cliente.
 */
export async function aprobarYCrearProyecto(cotizacionId: string) {
  const supabase = await createClient();

  const [{ data: cot, error: fetchError }, { data: items }] = await Promise.all([
    supabase.from("cotizaciones").select("*").eq("id", cotizacionId).single(),
    supabase.from("cotizacion_items").select("*").eq("cotizacion_id", cotizacionId).order("orden"),
  ]);
  if (fetchError || !cot) return { error: fetchError?.message || "No se encontró la cotización." };

  await supabase.from("cotizaciones").update({ estado: "Aprobada" }).eq("id", cotizacionId);

  const codigoProyecto = await generarCodigoProyecto(supabase);
  const { data: proyecto, error: proyError } = await supabase
    .from("proyectos")
    .insert({
      codigo: codigoProyecto,
      nombre: cot.nombre,
      cliente_id: cot.cliente_id,
      empresa_id: cot.empresa_id,
      responsable_id: cot.responsable_id,
      cotizacion_id: cot.id,
      estado: "Planeado",
    })
    .select("id")
    .single();
  if (proyError) return { error: proyError.message };

  const costosSemilla = Number(cot.costos_estimados || 0);
  const { data: nuevoPresupuesto, error: preError } = await supabase
    .from("presupuestos")
    .insert({
      proyecto_id: proyecto.id,
      cotizacion_id: cot.id,
      codigo: cot.codigo,
      nombre: cot.nombre,
      empresa_id: cot.empresa_id,
      costos: costosSemilla,
      resp_iva: cot.resp_iva ?? true,
      valor_cotizado: cot.valor_cotizado,
    })
    .select("id")
    .single();
  if (preError) return { error: preError.message };

  // Semilla el control de costos con los mismos ítems ya contemplados en la
  // cotización — quedan como filas normales, editables/eliminables igual que
  // cualquier otro costo del presupuesto.
  const itemsSemilla = (items ?? [])
    .filter((i) => Number(i.cantidad) * Number(i.costo_unitario) > 0)
    .map((i) => ({
      presupuesto_id: nuevoPresupuesto.id,
      categoria: CATEGORIA_POR_TIPO[i.tipo] ?? "Otros costos",
      descripcion: `${i.descripcion} (de la cotización)`,
      presupuestado: Number(i.cantidad) * Number(i.costo_unitario),
      origen: "Presupuesto",
    }));
  if (itemsSemilla.length) {
    const { error: semillaError } = await supabase.from("presupuesto_costos").insert(itemsSemilla);
    if (semillaError) return { error: semillaError.message };
  }

  revalidatePath(PATH);
  revalidatePath("/gestion/proyectos");
  revalidatePath("/gestion/presupuestos");
  redirect(`/gestion/proyectos/${proyecto.id}`);
}

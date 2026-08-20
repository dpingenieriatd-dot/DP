"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularCotizacion, calcularPresupuesto } from "@/lib/finance";
import { crearNotificacion } from "@/lib/notificaciones";

const PATH = "/gestion/cotizaciones";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * El select de "Empresa atendida" también permite elegir un Cliente directamente
 * (cuando la empresa atendida ES el cliente, sin intermediario) — llega como
 * "cliente:<id>". empresa_id sigue siendo una FK real a empresas_atendidas, así
 * que se busca (o se crea) la fila correspondiente para ese cliente.
 */
async function resolveEmpresaId(supabase: SupabaseServer, raw: FormDataEntryValue | null): Promise<string | null> {
  const value = raw ? String(raw) : "";
  if (!value) return null;
  if (!value.startsWith("cliente:")) return value;

  const clienteId = value.slice("cliente:".length);
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
  const margenPct = Number(formData.get("margen_pct") || 30);
  const adminPct = Number(formData.get("admin_pct") || 15);
  if (costosEstimados <= 0) {
    return { costosEstimados: null, respIva, margenPct, adminPct, valorSugerido: undefined, margenNeg: undefined };
  }
  const f = calcularPresupuesto({
    costos: costosEstimados,
    admin_pct: adminPct,
    margen_pct: margenPct,
    resp_iva: respIva,
    iva_pct: 19,
    valor_cotizado: valorCotizado,
  });
  return { costosEstimados, respIva, margenPct, adminPct, valorSugerido: f.valorSugerido, margenNeg: f.margenNeg };
}

/** El código no se puede reusar ni siquiera si la cotización que lo tenía ya se borró o le cambiaron el código (migration_25). */
async function codigoLiberado(supabase: SupabaseServer, codigo: string) {
  const { data } = await supabase.from("cotizaciones_codigos_usados").select("codigo").eq("codigo", codigo).maybeSingle();
  return !!data;
}

export async function crearCotizacion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const codigo = (formData.get("codigo") as string) || null;
  if (codigo && (await codigoLiberado(supabase, codigo))) {
    return { error: "Ya existe una cotización con este código. Usa un código diferente." };
  }

  const inputs = inputsFromForm(formData);
  const calc = calcularCotizacion(inputs);
  const rent = rentabilidadFromForm(formData, calc.valorCotizado);
  const empresaId = await resolveEmpresaId(supabase, formData.get("empresa_id"));

  const { error } = await supabase.from("cotizaciones").insert({
    codigo: formData.get("codigo") || null,
    cliente_id: formData.get("cliente_id") || null,
    empresa_id: empresaId,
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
    margen_pct: rent.margenPct,
    admin_pct: rent.adminPct,
    ...(rent.valorSugerido !== undefined ? { valor_sugerido: rent.valorSugerido, margen: rent.margenNeg } : {}),
    creado_por: user?.id ?? null,
  });
  if (error) return { error: codigoDuplicado(error) };
  revalidatePath(PATH);
}

/** El código de cotización es único a nivel de base de datos — mensaje legible en vez del error crudo de Postgres. */
function codigoDuplicado(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Ya existe una cotización con este código. Usa un código diferente.";
  return error.message;
}

export async function actualizarCotizacion(id: string, formData: FormData) {
  const supabase = await createClient();
  const inputs = inputsFromForm(formData);
  const calc = calcularCotizacion(inputs);
  const rent = rentabilidadFromForm(formData, calc.valorCotizado);
  const nuevoEstado = (formData.get("estado") as string) || "Borrador";
  const empresaId = await resolveEmpresaId(supabase, formData.get("empresa_id"));

  const { data: previa } = await supabase.from("cotizaciones").select("estado, creado_por, nombre, codigo").eq("id", id).single();

  const codigo = (formData.get("codigo") as string) || null;
  if (codigo && codigo !== previa?.codigo && (await codigoLiberado(supabase, codigo))) {
    return { error: "Ya existe una cotización con este código. Usa un código diferente." };
  }

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      codigo: formData.get("codigo") || null,
      cliente_id: formData.get("cliente_id") || null,
      empresa_id: empresaId,
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
      margen_pct: rent.margenPct,
      admin_pct: rent.adminPct,
      ...(rent.valorSugerido !== undefined ? { valor_sugerido: rent.valorSugerido, margen: rent.margenNeg } : {}),
      estado: nuevoEstado,
    })
    .eq("id", id);
  if (error) return { error: codigoDuplicado(error) };

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

  // Si ya se estimaron costos internos reales al cotizar, se usan tal cual
  // (es la fuente más confiable). Si no, se cae al viejo estimado grueso
  // (materiales + profesional cobrado) para no dejar el presupuesto en cero.
  const costosSemilla =
    cot.costos_estimados != null && Number(cot.costos_estimados) > 0
      ? Number(cot.costos_estimados)
      : Number(cot.val_materiales || 0) + Number(cot.valor_prof || 0);
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

  // Semilla el control de costos con los ítems que ya estaban contemplados en la
  // cotización (materiales y profesional cobrado) — quedan como filas normales,
  // editables/eliminables igual que cualquier otro costo del presupuesto.
  const itemsSemilla = [
    Number(cot.val_materiales) > 0 && {
      presupuesto_id: nuevoPresupuesto.id,
      categoria: "Materiales / desgaste",
      descripcion: "Materiales (de la cotización)",
      presupuestado: Number(cot.val_materiales),
      origen: "Presupuesto",
    },
    Number(cot.valor_prof) > 0 && {
      presupuesto_id: nuevoPresupuesto.id,
      categoria: "Servicios / profesionales",
      descripcion: "Profesional (de la cotización)",
      presupuestado: Number(cot.valor_prof),
      origen: "Presupuesto",
    },
  ].filter(Boolean);
  if (itemsSemilla.length) {
    const { error: semillaError } = await supabase.from("presupuesto_costos").insert(itemsSemilla);
    if (semillaError) return { error: semillaError.message };
  }

  revalidatePath(PATH);
  revalidatePath("/gestion/proyectos");
  revalidatePath("/gestion/presupuestos");
  redirect(`/gestion/proyectos/${proyecto.id}`);
}

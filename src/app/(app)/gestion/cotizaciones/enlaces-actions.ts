"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/gestion/cotizaciones";
const MAX_ENLACES = 10;

function normalizarUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const conEsquema = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(conEsquema);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function agregarEnlace(cotizacionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión activa." };

  const url = normalizarUrl(String(formData.get("url") ?? ""));
  if (!url) return { error: "Ingresa una URL válida (http o https)." };
  const titulo = String(formData.get("titulo") ?? "").trim() || null;

  const { count } = await supabase
    .from("cotizacion_enlaces")
    .select("id", { count: "exact", head: true })
    .eq("cotizacion_id", cotizacionId);
  if ((count ?? 0) >= MAX_ENLACES) return { error: `Máximo ${MAX_ENLACES} enlaces por cotización.` };

  const { error } = await supabase.from("cotizacion_enlaces").insert({
    cotizacion_id: cotizacionId,
    titulo,
    url,
    orden: count ?? 0,
    creado_por: user.id,
  });
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

export async function eliminarEnlace(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cotizacion_enlaces").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(PATH);
}

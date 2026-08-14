import type { SupabaseClient } from "@supabase/supabase-js";

/** Inserta una fila en `notificaciones` para que le aparezca en la campana a `usuarioId`. */
export async function crearNotificacion(
  supabase: SupabaseClient,
  params: { usuarioId: string | null | undefined; tipo: string; titulo: string; mensaje?: string | null; enlace?: string },
) {
  if (!params.usuarioId) return;
  await supabase.from("notificaciones").insert({
    usuario_id: params.usuarioId,
    tipo: params.tipo,
    titulo: params.titulo,
    mensaje: params.mensaje ?? null,
    enlace: params.enlace ?? null,
  });
}

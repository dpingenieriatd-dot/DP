"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function notificarPorCorreo(ticket: { titulo: string; descripcion: string; urgencia: string; pagina: string | null }, reportadoPor: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const destino = process.env.SOPORTE_EMAIL;
  // Si falta cualquiera de las dos, el ticket igual queda guardado — el
  // correo es un aviso adicional, no la fuente de verdad (esa es la tabla).
  if (!resendKey || !destino) return;

  const remitente = process.env.RESUMEN_REMITENTE || "D&P Ingeniería Integral <notificaciones@dpingenieriaintegral.com>";
  const html = `
    <p><strong>${reportadoPor}</strong> reportó un problema en la plataforma D&P:</p>
    <p><strong>Urgencia:</strong> ${ticket.urgencia}</p>
    <p><strong>Título:</strong> ${ticket.titulo}</p>
    <p><strong>Descripción:</strong><br/>${ticket.descripcion.replace(/\n/g, "<br/>")}</p>
    ${ticket.pagina ? `<p><strong>Página:</strong> ${ticket.pagina}</p>` : ""}
    <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://app.dpingenieriaintegral.com"}/admin/soporte">Ver en Soporte técnico</a></p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente,
        to: [destino],
        subject: `[Soporte D&P] ${ticket.urgencia} · ${ticket.titulo}`,
        html,
      }),
    });
  } catch {
    // El correo es "mejor esfuerzo": si Resend falla, el ticket ya quedó
    // guardado y sigue visible en la lista de Soporte técnico.
  }
}

export async function crearTicket(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const urgencia = String(formData.get("urgencia") || "Media");
  const pagina = String(formData.get("pagina") || "").trim() || null;

  if (!titulo || !descripcion) return { error: "Título y descripción son obligatorios." };

  const { data: perfil } = user ? await supabase.from("profiles").select("full_name, email").eq("id", user.id).single() : { data: null };

  const { error } = await supabase.from("soporte_tickets").insert({
    titulo,
    descripcion,
    urgencia,
    pagina,
    creado_por: user?.id ?? null,
  });
  if (error) return { error: error.message };

  await notificarPorCorreo({ titulo, descripcion, urgencia, pagina }, perfil?.full_name || perfil?.email || "Un usuario");

  revalidatePath("/admin/soporte");
}

export async function actualizarTicket(id: string, formData: FormData) {
  const supabase = await createClient();
  const estado = String(formData.get("estado") || "Abierto");
  const respuesta = String(formData.get("respuesta") || "").trim() || null;

  const { error } = await supabase
    .from("soporte_tickets")
    .update({
      estado,
      respuesta,
      resuelto_en: estado === "Resuelto" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/soporte");
}

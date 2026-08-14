import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularPresupuesto, calcularControlCostos, money } from "@/lib/finance";

export const dynamic = "force-dynamic";

const C = {
  verdeOscuro: "#27500A",
  verde: "#639922",
  ambar: "#BA7517",
  gris: "#5F5E5A",
  hueso: "#F1EFE8",
  borde: "#E4E1D6",
  rojo: "#B42318",
};

function haceDias(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fechaLarga(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

type TareaTerminada = { titulo: string; fecha_cierre: string | null };
type ProyectoNegativo = { nombre: string; ganancia: number };
type CompraPendiente = { referencia: string; saldo: number };

function renderHtml(params: {
  desde: string;
  hasta: string;
  siteUrl: string;
  tareasTerminadas: TareaTerminada[];
  proyectosNegativos: ProyectoNegativo[];
  comprasPendientes: CompraPendiente[];
  totalPendiente: number;
}) {
  const { desde, hasta, siteUrl, tareasTerminadas, proyectosNegativos, comprasPendientes, totalPendiente } = params;

  const listItem = (texto: string, sub?: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${C.borde};font-size:13px;color:${C.gris};">
        <span style="color:#1a1a1a;">${texto}</span>${sub ? `<br/><span style="font-size:11px;color:#8A897F;">${sub}</span>` : ""}
      </td>
    </tr>`;

  const seccionTareas = tareasTerminadas.length
    ? tareasTerminadas
        .slice(0, 10)
        .map((t) => listItem(t.titulo, t.fecha_cierre ? fechaLarga(t.fecha_cierre) : undefined))
        .join("")
    : `<tr><td style="padding:9px 0;font-size:13px;color:#8A897F;">Ninguna tarea cerrada esta semana.</td></tr>`;

  const seccionProyectos = proyectosNegativos.length
    ? proyectosNegativos
        .map((p) => listItem(p.nombre, `Ganancia estimada: ${money.format(p.ganancia)}`))
        .join("")
    : `<tr><td style="padding:9px 0;font-size:13px;color:${C.verde};">Ningún proyecto activo con margen negativo. ✓</td></tr>`;

  const seccionCompras = comprasPendientes.length
    ? comprasPendientes
        .slice(0, 10)
        .map((c) => listItem(c.referencia, `Saldo pendiente: ${money.format(c.saldo)}`))
        .join("")
    : `<tr><td style="padding:9px 0;font-size:13px;color:${C.verde};">Sin compras pendientes de pago. ✓</td></tr>`;

  const stat = (valor: string, etiqueta: string, color: string) => `
    <td width="33%" style="padding:14px 10px;text-align:center;border-right:1px solid ${C.borde};">
      <div style="font-size:22px;font-weight:700;color:${color};">${valor}</div>
      <div style="font-size:10.5px;color:#8A897F;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">${etiqueta}</div>
    </td>`;

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:${C.hueso};font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.hueso};padding:28px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;width:100%;">
          <tr>
            <td style="background:${C.verdeOscuro};padding:24px 28px;">
              <div style="font-size:11px;letter-spacing:1px;color:#B9CFA0;text-transform:uppercase;font-weight:700;">D&amp;P Ingeniería Integral</div>
              <div style="font-size:19px;color:#ffffff;font-weight:700;margin-top:4px;">Resumen semanal</div>
              <div style="font-size:12px;color:#D9E8C8;margin-top:3px;">${fechaLarga(desde)} — ${fechaLarga(hasta)}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid ${C.borde};border-radius:6px;">
                <tr>
                  ${stat(String(tareasTerminadas.length), "Tareas cerradas", C.verdeOscuro)}
                  ${stat(String(proyectosNegativos.length), "Proyectos en rojo", proyectosNegativos.length ? C.rojo : C.verde)}
                  <td width="33%" style="padding:14px 10px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:${comprasPendientes.length ? C.ambar : C.verde};">${money.format(totalPendiente)}</div>
                    <div style="font-size:10.5px;color:#8A897F;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">Compras por pagar</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 28px 4px;">
              <div style="font-size:13px;font-weight:700;color:${C.verdeOscuro};text-transform:uppercase;letter-spacing:0.3px;">Tareas completadas</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${seccionTareas}</table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 4px;">
              <div style="font-size:13px;font-weight:700;color:${C.verdeOscuro};text-transform:uppercase;letter-spacing:0.3px;">Proyectos con margen negativo</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${seccionProyectos}</table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 4px;">
              <div style="font-size:13px;font-weight:700;color:${C.verdeOscuro};text-transform:uppercase;letter-spacing:0.3px;">Compras pendientes de pago</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${seccionCompras}</table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 28px 28px;">
              <a href="${siteUrl}" style="display:inline-block;background:${C.verdeOscuro};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:6px;">Abrir la plataforma</a>
            </td>
          </tr>

          <tr>
            <td style="padding:14px 28px;border-top:1px solid ${C.borde};">
              <div style="font-size:10.5px;color:#8A897F;">Resumen automático semanal · D&amp;P Ingeniería Integral S.A.S. · Plataforma interna</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const desde = haceDias(7);
  const hasta = new Date().toISOString().slice(0, 10);

  const [{ data: admins }, { data: tareasTerminadas }, { data: proyectos }, { data: presupuestos }, { data: costos }, { data: compras }] =
    await Promise.all([
      supabase.from("profiles").select("email, full_name").eq("role", "admin"),
      supabase
        .from("tareas")
        .select("titulo, fecha_cierre")
        .eq("estado", "Terminada")
        .gte("fecha_cierre", desde)
        .order("fecha_cierre", { ascending: false }),
      supabase.from("proyectos").select("id, codigo, nombre").eq("archivado", false),
      supabase.from("presupuestos").select("*"),
      supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
      supabase
        .from("compras")
        .select("id, referencia, valor_unitario, cantidad, valor_pagado, estado_pago")
        .eq("archivado", false)
        .neq("estado_pago", "Pagado"),
    ]);

  const proyectosNegativos: ProyectoNegativo[] = [];
  for (const proy of proyectos ?? []) {
    const presDelProyecto = (presupuestos ?? []).filter((p) => p.proyecto_id === proy.id);
    if (!presDelProyecto.length) continue;
    let gananciaTotal = 0;
    for (const pre of presDelProyecto) {
      const f = calcularPresupuesto(pre);
      const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
      const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
      gananciaTotal += control.gananciaEst;
    }
    if (gananciaTotal < 0) {
      proyectosNegativos.push({ nombre: `${proy.codigo ? proy.codigo + " · " : ""}${proy.nombre}`, ganancia: gananciaTotal });
    }
  }

  const comprasPendientes: CompraPendiente[] = (compras ?? []).map((c) => ({
    referencia: c.referencia || "(sin referencia)",
    saldo: c.cantidad * c.valor_unitario - c.valor_pagado,
  }));
  const totalPendiente = comprasPendientes.reduce((a, c) => a + c.saldo, 0);

  const destinatarios = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);
  if (!destinatarios.length) {
    return NextResponse.json({ ok: true, enviado: false, motivo: "no hay administradores con correo" });
  }

  const html = renderHtml({
    desde,
    hasta,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://dp-dp-728a.vercel.app",
    tareasTerminadas: tareasTerminadas ?? [],
    proyectosNegativos,
    comprasPendientes,
    totalPendiente,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: false, motivo: "Falta RESEND_API_KEY en las variables de entorno" }, { status: 500 });
  }

  const remitente = process.env.RESUMEN_REMITENTE || "D&P Ingeniería Integral <notificaciones@dpingenieriaintegral.com>";

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: remitente,
      to: destinatarios,
      subject: `Resumen semanal · ${fechaLarga(desde)} — ${fechaLarga(hasta)}`,
      html,
    }),
  });

  if (!resp.ok) {
    const texto = await resp.text();
    return NextResponse.json({ ok: false, motivo: texto }, { status: 502 });
  }

  return NextResponse.json({ ok: true, enviado: true, destinatarios: destinatarios.length });
}

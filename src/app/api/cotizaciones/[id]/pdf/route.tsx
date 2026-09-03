import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { calcularCotizacionItems } from "@/lib/finance";
import { CotizacionDoc } from "@/lib/pdf/cotizacion-doc";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [{ data: cotizacion, error: cotError }, { data: items }] = await Promise.all([
    supabase.from("cotizaciones").select("*, clientes(nombre, nit), empresas_atendidas(nombre)").eq("id", id).single(),
    supabase.from("cotizacion_items").select("*").eq("cotizacion_id", id).order("orden"),
  ]);
  if (cotError || !cotizacion) return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 });

  const calc = calcularCotizacionItems(
    (items ?? []).map((i) => ({ cantidad: Number(i.cantidad || 0), costo_unitario: Number(i.costo_unitario || 0), precio_cliente_override: i.precio_cliente_override, lleva_iva: i.lleva_iva })),
    { admin_pct: cotizacion.admin_pct ?? 15, margen_pct: cotizacion.margen_pct ?? 30, resp_iva: cotizacion.resp_iva ?? true, iva_pct: 19 }
  );

  const itemsPdf = (items ?? []).map((i, idx) => ({
    descripcion: i.descripcion,
    unidad: i.unidad,
    cantidad: Number(i.cantidad || 0),
    unitClient: calc.itemsCalculados[idx].unitClient,
    subtotalCliente: calc.itemsCalculados[idx].subtotalCliente,
  }));

  const buffer = await renderToBuffer(
    <CotizacionDoc
      codigo={cotizacion.codigo || "—"}
      fecha={cotizacion.fecha}
      vigenciaDias={cotizacion.vigencia_dias}
      estado={cotizacion.estado}
      fechaAprobacion={cotizacion.fecha_aprobacion}
      medioAprobacion={cotizacion.medio_aprobacion}
      clienteNombre={cotizacion.clientes?.nombre ?? "—"}
      clienteNit={cotizacion.clientes?.nit ?? null}
      empresaNombre={cotizacion.empresas_atendidas?.nombre ?? "—"}
      contacto={cotizacion.contacto}
      correoContacto={cotizacion.correo_contacto}
      telefonoContacto={cotizacion.telefono_contacto}
      descripcionCliente={cotizacion.descripcion_cliente}
      formaPago={cotizacion.forma_pago}
      condicionesCliente={cotizacion.condiciones_cliente}
      items={itemsPdf}
      clientSubtotal={calc.clientSubtotal}
      aplicaIva={calc.aplicaIva}
      clientIva={calc.clientIva}
      clientTotal={calc.clientTotal}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cotizacion.codigo || "cotizacion"}.pdf"`,
    },
  });
}

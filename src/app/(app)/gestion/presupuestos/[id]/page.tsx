import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, calcularCotizacionItems } from "@/lib/finance";
import { PresupuestoDetalle } from "./detalle";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: presupuesto }, { data: costos }] = await Promise.all([
    supabase
      .from("presupuestos")
      .select("*, proyectos(id, codigo, nombre), cotizaciones(id, codigo, estado, fecha, resp_iva, admin_pct, margen_pct, valor_cotizado, cliente_id, clientes(nombre, nit))")
      .eq("id", id)
      .single(),
    supabase.from("presupuesto_costos").select("*").eq("presupuesto_id", id).order("created_at"),
  ]);

  if (!presupuesto) notFound();

  const f = calcularPresupuesto(presupuesto);
  const control = calcularControlCostos(costos ?? [], f.valorCotizado, f.admin, f.iva);

  let baseCotizacion = null;
  if (presupuesto.cotizaciones) {
    const { data: items } = await supabase
      .from("cotizacion_items")
      .select("*")
      .eq("cotizacion_id", presupuesto.cotizaciones.id)
      .order("orden");
    const calc = calcularCotizacionItems(
      (items ?? []).map((i) => ({ cantidad: i.cantidad, costo_unitario: i.costo_unitario, precio_cliente_override: i.precio_cliente_override })),
      {
        admin_pct: presupuesto.cotizaciones.admin_pct ?? 15,
        margen_pct: presupuesto.cotizaciones.margen_pct ?? 30,
        resp_iva: presupuesto.cotizaciones.resp_iva ?? true,
        iva_pct: 19,
      }
    );
    baseCotizacion = {
      codigo: presupuesto.cotizaciones.codigo,
      fecha: presupuesto.cotizaciones.fecha,
      cliente: presupuesto.cotizaciones.clientes?.nombre ?? null,
      nit: presupuesto.cotizaciones.clientes?.nit ?? null,
      valorAprobado: presupuesto.cotizaciones.valor_cotizado,
      items: (items ?? []).map((item, idx) => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad,
        costoUnitario: item.costo_unitario,
        unitClient: calc.itemsCalculados[idx]?.unitClient ?? 0,
        subtotal: calc.itemsCalculados[idx]?.subtotalCliente ?? 0,
      })),
      subtotalCliente: calc.clientSubtotal,
      ivaCliente: calc.clientIva,
      total: calc.clientTotal,
    };
  }

  return <PresupuestoDetalle presupuesto={presupuesto} costos={costos ?? []} f={f} control={control} baseCotizacion={baseCotizacion} />;
}

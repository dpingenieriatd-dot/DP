import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, calcularCotizacionItems, costoBasePresupuesto } from "@/lib/finance";
import { PresupuestoDetalle } from "./detalle";

type CompraRow = {
  id: string;
  codigo: string | null;
  descripcion: string | null;
  categoria: string | null;
  cantidad: number | null;
  valor_unitario: number | null;
  valor_pagado: number | null;
  estado_pago: string;
  archivado: boolean | null;
  presupuesto_id: string | null;
  presupuesto_costo_id: string | null;
  proveedores: { nombre: string } | null;
  insumos: { descripcion: string } | null;
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: presupuesto }, { data: costos }] = await Promise.all([
    supabase
      .from("presupuestos")
      .select("*, proyectos(id, codigo, nombre), cotizaciones(id, codigo, estado, fecha, resp_iva, admin_pct, margen_pct, valor_cotizado, cliente_id, clientes(nombre, nit))")
      .eq("id", id)
      .single(),
    // orden primero: created_at no sirve de criterio único porque los ítems
    // sembrados al aprobar la cotización se insertan todos de una vez y quedan
    // con el mismo created_at (ver migration_47).
    supabase.from("presupuesto_costos").select("*").eq("presupuesto_id", id).order("orden").order("created_at"),
  ]);

  if (!presupuesto) notFound();

  // El costo real sale de las compras, no del campo manual de cada línea. Cada
  // compra pertenece a un presupuesto (migration_51). Las compras sin asignar
  // solo cuentan si el proyecto tiene un único presupuesto (compatibilidad con
  // lo anterior y con el auto-asignado del formulario).
  const [{ data: compras }, { count: totalPresupuestos }] = presupuesto.proyecto_id
    ? await Promise.all([
        supabase
          .from("compras")
          .select("id, codigo, descripcion, categoria, cantidad, valor_unitario, valor_pagado, estado_pago, archivado, presupuesto_id, presupuesto_costo_id, proveedores(nombre), insumos(descripcion)")
          .eq("proyecto_id", presupuesto.proyecto_id),
        supabase.from("presupuestos").select("id", { count: "exact", head: true }).eq("proyecto_id", presupuesto.proyecto_id),
      ])
    : [{ data: [] }, { count: 0 }];
  const esUnico = (totalPresupuestos ?? 0) <= 1;
  const valorCompra = (c: { cantidad: number | null; valor_unitario: number | null }) =>
    Number(c.cantidad || 0) * Number(c.valor_unitario || 0);
  const comprasDeEste = ((compras ?? []) as unknown as CompraRow[])
    .filter((c) => !c.archivado && (c.presupuesto_id === id || (c.presupuesto_id == null && esUnico)))
    .map((c) => ({
      id: c.id,
      codigo: c.codigo,
      descripcion: c.descripcion || c.insumos?.descripcion || null,
      categoria: c.categoria || "Otros costos",
      proveedor: c.proveedores?.nombre ?? null,
      lineaId: c.presupuesto_costo_id ?? null,
      valor: valorCompra(c),
      pagado: c.estado_pago === "Pagado" ? valorCompra(c) : Number(c.valor_pagado || 0),
      estado: c.estado_pago,
    }));
  const comprometidoCompras = comprasDeEste.reduce((s, c) => s + c.valor, 0);
  const pagadoCompras = comprasDeEste.reduce((s, c) => s + c.pagado, 0);
  const hayCompras = comprasDeEste.length > 0;

  const f = calcularPresupuesto({ ...presupuesto, costos: costoBasePresupuesto(presupuesto, costos ?? []) });
  const control = calcularControlCostos(costos ?? [], f.valorCotizado, f.admin, f.iva, hayCompras ? comprometidoCompras : undefined);

  let baseCotizacion = null;
  if (presupuesto.cotizaciones) {
    const { data: items } = await supabase
      .from("cotizacion_items")
      .select("*")
      .eq("cotizacion_id", presupuesto.cotizaciones.id)
      .order("orden");
    const calc = calcularCotizacionItems(
      (items ?? []).map((i) => ({ cantidad: i.cantidad, costo_unitario: i.costo_unitario, precio_cliente_override: i.precio_cliente_override, lleva_iva: i.lleva_iva })),
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

  return (
    <PresupuestoDetalle
      presupuesto={presupuesto}
      costos={costos ?? []}
      f={f}
      control={control}
      baseCotizacion={baseCotizacion}
      hayCompras={hayCompras}
      comprometidoCompras={comprometidoCompras}
      pagadoCompras={pagadoCompras}
      comprasVinculadas={comprasDeEste}
    />
  );
}

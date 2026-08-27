import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, costoBasePresupuesto } from "@/lib/finance";
import { ProyectoDetalle } from "./detalle";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proyecto }, { data: clientes }, { data: empresas }, { data: profiles }, { data: presupuestos }, { data: compras }, { data: costos }] =
    await Promise.all([
      supabase.from("proyectos").select("*").eq("id", id).single(),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("empresas_atendidas").select("id, nombre").order("nombre"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("presupuestos").select("*").eq("proyecto_id", id).order("created_at"),
      supabase.from("compras").select("*, proveedores(nombre)").eq("proyecto_id", id).order("fecha", { ascending: false }),
      supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
    ]);

  if (!proyecto) notFound();

  const { data: cotizacion } = proyecto.cotizacion_id
    ? await supabase
        .from("cotizaciones")
        .select("codigo, fecha_aprobacion, medio_aprobacion")
        .eq("id", proyecto.cotizacion_id)
        .single()
    : { data: null };

  // El costo real del proyecto sale de sus compras registradas, no de un campo manual.
  const realCompras = (compras ?? [])
    .filter((c) => !c.archivado)
    .reduce((s, c) => s + Number(c.cantidad || 0) * Number(c.valor_unitario || 0), 0);

  const presupuestosConCalc = (presupuestos ?? []).map((pre) => {
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const f = calcularPresupuesto({ ...pre, costos: costoBasePresupuesto(pre, items) });
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva, realCompras);
    return { pre, f, control };
  });

  return (
    <ProyectoDetalle
      proyecto={proyecto}
      cotizacion={cotizacion}
      clientes={clientes ?? []}
      empresas={empresas ?? []}
      profiles={profiles ?? []}
      presupuestos={presupuestosConCalc}
      compras={compras ?? []}
    />
  );
}

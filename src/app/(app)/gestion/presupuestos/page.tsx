import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, costoBasePresupuesto } from "@/lib/finance";
import { PresupuestosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: presupuestos }, { data: proyectos }, { data: costos }, { data: clientes }, { data: cotizaciones }, { data: compras }] = await Promise.all([
    supabase.from("presupuestos").select("*").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre, cliente_id, estado").eq("archivado", false).order("nombre"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
    supabase.from("clientes").select("id, nombre, nit"),
    supabase.from("cotizaciones").select("id, codigo"),
    supabase.from("compras").select("proyecto_id, presupuesto_id, cantidad, valor_unitario, archivado").eq("archivado", false),
  ]);

  // Cuántos presupuestos tiene cada proyecto — una compra sin presupuesto_id
  // solo cuenta si el proyecto tiene un único presupuesto (ver migration_51).
  const presupuestosPorProyecto = new Map<string, number>();
  for (const p of presupuestos ?? []) {
    if (p.proyecto_id) presupuestosPorProyecto.set(p.proyecto_id, (presupuestosPorProyecto.get(p.proyecto_id) ?? 0) + 1);
  }
  const comprometidoDePresupuesto = (pre: { id: string; proyecto_id: string | null }) => {
    const unico = (presupuestosPorProyecto.get(pre.proyecto_id ?? "") ?? 0) <= 1;
    return (compras ?? [])
      .filter((c) => c.presupuesto_id === pre.id || (c.presupuesto_id == null && c.proyecto_id === pre.proyecto_id && unico))
      .reduce((s, c) => s + Number(c.cantidad || 0) * Number(c.valor_unitario || 0), 0);
  };

  const proyectoDe = (id: string) => proyectos?.find((p) => p.id === id) ?? null;

  const clienteDeProyecto = (proyectoId: string) => {
    const p = proyectoDe(proyectoId);
    return clientes?.find((c) => c.id === p?.cliente_id) ?? null;
  };

  const filas = (presupuestos ?? []).map((pre) => {
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const f = calcularPresupuesto({ ...pre, costos: costoBasePresupuesto(pre, items) });
    const realCompras = comprometidoDePresupuesto(pre);
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva, realCompras > 0 ? realCompras : undefined);
    const proyecto = proyectoDe(pre.proyecto_id);
    const cliente = clienteDeProyecto(pre.proyecto_id);
    const cotizacion = cotizaciones?.find((c) => c.id === pre.cotizacion_id);
    return {
      pre,
      f,
      control,
      proyectoCodigo: proyecto?.codigo || "—",
      proyectoNombre: proyecto?.nombre || "—",
      proyectoEstado: proyecto?.estado || "—",
      cotizacionCodigo: cotizacion?.codigo || "—",
      cliente: cliente?.nombre ?? "—",
      nit: cliente?.nit ?? "—",
    };
  });

  return <PresupuestosList filas={filas} />;
}

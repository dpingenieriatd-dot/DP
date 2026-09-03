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
    supabase.from("compras").select("proyecto_id, cantidad, valor_unitario, archivado").eq("archivado", false),
  ]);

  const realComprasDeProyecto = (proyectoId: string | null) =>
    (compras ?? []).filter((c) => c.proyecto_id === proyectoId).reduce((s, c) => s + Number(c.cantidad || 0) * Number(c.valor_unitario || 0), 0);

  const proyectoDe = (id: string) => proyectos?.find((p) => p.id === id) ?? null;

  const clienteDeProyecto = (proyectoId: string) => {
    const p = proyectoDe(proyectoId);
    return clientes?.find((c) => c.id === p?.cliente_id) ?? null;
  };

  const filas = (presupuestos ?? []).map((pre) => {
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const f = calcularPresupuesto({ ...pre, costos: costoBasePresupuesto(pre, items) });
    const realCompras = realComprasDeProyecto(pre.proyecto_id);
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

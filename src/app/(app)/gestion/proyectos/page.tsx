import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos } from "@/lib/finance";
import { ProyectosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: proyectos }, { data: clientes }, { data: profiles }, { data: presupuestos }, { data: costos }, { data: cotizaciones }] = await Promise.all([
    supabase.from("proyectos").select("*").eq("archivado", false).order("nombre"),
    supabase.from("clientes").select("id, nombre, nit").order("nombre"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("presupuestos").select("*"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
    supabase.from("cotizaciones").select("id, codigo, valor_cotizado"),
  ]);

  const nombreDe = (arr: { id: string; nombre?: string; full_name?: string | null; email?: string | null }[] | null, id: string | null) => {
    const x = arr?.find((x) => x.id === id);
    return x ? x.nombre || x.full_name || x.email || "—" : "—";
  };
  const nitDe = (id: string | null) => clientes?.find((c) => c.id === id)?.nit || "—";
  const cotizacionDe = (id: string | null) => cotizaciones?.find((c) => c.id === id) ?? null;

  const filas = (proyectos ?? []).map((proy) => {
    const presDelProyecto = (presupuestos ?? []).filter((p) => p.proyecto_id === proy.id);
    let costoVigente = 0;
    let gananciaTotal = 0;
    for (const pre of presDelProyecto) {
      const f = calcularPresupuesto(pre);
      const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
      const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
      costoVigente += control.real;
      gananciaTotal += control.gananciaActual;
    }
    const cotizacion = cotizacionDe(proy.cotizacion_id);
    return {
      proy,
      cliente: nombreDe(clientes, proy.cliente_id),
      nitCliente: nitDe(proy.cliente_id),
      responsable: nombreDe(profiles, proy.responsable_id),
      cotizacionCodigo: cotizacion?.codigo || "—",
      valorAprobado: cotizacion?.valor_cotizado ?? 0,
      costoVigente,
      gananciaTotal,
    };
  });

  return <ProyectosList filas={filas} />;
}

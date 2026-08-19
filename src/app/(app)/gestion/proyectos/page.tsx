import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos } from "@/lib/finance";
import { ProyectosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: proyectos }, { data: clientes }, { data: empresas }, { data: profiles }, { data: presupuestos }, { data: costos }, { data: cotizaciones }] =
    await Promise.all([
      supabase.from("proyectos").select("*").eq("archivado", false).order("nombre"),
      supabase.from("clientes").select("id, nombre, nit").order("nombre"),
      supabase.from("empresas_atendidas").select("id, nombre").order("nombre"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("presupuestos").select("*"),
      supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
      supabase.from("cotizaciones").select("id, codigo"),
    ]);

  const nombreDe = (arr: { id: string; nombre?: string; full_name?: string | null; email?: string | null }[] | null, id: string | null) => {
    const x = arr?.find((x) => x.id === id);
    return x ? x.nombre || x.full_name || x.email || "—" : "—";
  };
  const nitDe = (id: string | null) => clientes?.find((c) => c.id === id)?.nit || "—";
  const codigoCotizacionDe = (id: string | null) => cotizaciones?.find((c) => c.id === id)?.codigo || "—";

  const filas = (proyectos ?? []).map((proy) => {
    const presDelProyecto = (presupuestos ?? []).filter((p) => p.proyecto_id === proy.id);
    let gananciaTotal = 0;
    let viableTodos = true;
    for (const pre of presDelProyecto) {
      const f = calcularPresupuesto(pre);
      const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
      const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
      gananciaTotal += control.gananciaEst;
      if (!f.viable) viableTodos = false;
    }
    return {
      proy,
      cliente: nombreDe(clientes, proy.cliente_id),
      nitCliente: nitDe(proy.cliente_id),
      empresa: nombreDe(empresas, proy.empresa_id),
      responsable: nombreDe(profiles, proy.responsable_id),
      cotizacionCodigo: codigoCotizacionDe(proy.cotizacion_id),
      numPresupuestos: presDelProyecto.length,
      gananciaTotal,
      viableTodos: presDelProyecto.length > 0 ? viableTodos : null,
    };
  });

  return <ProyectosList filas={filas} clientes={clientes ?? []} empresas={empresas ?? []} profiles={profiles ?? []} />;
}

import { createClient } from "@/lib/supabase/server";
import { calcularEstadoProyecto, costoBasePresupuesto } from "@/lib/finance";
import { ProyectosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: proyectos }, { data: clientes }, { data: profiles }, { data: presupuestos }, { data: costos }, { data: cotizaciones }, { data: compras }, { data: settings }] =
    await Promise.all([
      supabase.from("proyectos").select("*").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nombre, nit").order("nombre"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("presupuestos").select("*"),
      supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
      supabase.from("cotizaciones").select("id, codigo, valor_cotizado"),
      supabase.from("compras").select("proyecto_id, cantidad, valor_unitario, estado_pago, archivado").eq("archivado", false),
      supabase.from("settings").select("*").eq("id", 1).single(),
    ]);

  const umbralRiesgoPct = Number(settings?.umbral_ejecucion_pct ?? 80);

  const nombreDe = (arr: { id: string; nombre?: string; full_name?: string | null; email?: string | null }[] | null, id: string | null) => {
    const x = arr?.find((x) => x.id === id);
    return x ? x.nombre || x.full_name || x.email || "—" : "—";
  };
  const nitDe = (id: string | null) => clientes?.find((c) => c.id === id)?.nit || "—";
  const cotizacionDe = (id: string | null) => cotizaciones?.find((c) => c.id === id) ?? null;

  const filas = (proyectos ?? []).map((proy) => {
    const presDelProyecto = (presupuestos ?? []).filter((p) => p.proyecto_id === proy.id);
    const ref = presDelProyecto[0];
    const estado = calcularEstadoProyecto({
      valorAprobado: presDelProyecto.reduce((s, p) => s + Number(p.valor_cotizado || 0), 0),
      planCosto: presDelProyecto.reduce(
        (s, p) => s + costoBasePresupuesto(p, (costos ?? []).filter((c) => c.presupuesto_id === p.id)),
        0,
      ),
      adminPct: Number(ref?.admin_pct ?? settings?.admin_pct ?? 15),
      margenPct: Number(ref?.margen_pct ?? settings?.margin_pct ?? 30),
      respIva: ref?.resp_iva ?? true,
      ivaPct: Number(ref?.iva_pct ?? settings?.iva_pct ?? 19),
      compras: (compras ?? []).filter((c) => c.proyecto_id === proy.id),
      umbralRiesgoPct,
    });
    const costoVigente = estado.comprometido;
    const gananciaTotal = estado.gananciaReal;
    const cotizacion = cotizacionDe(proy.cotizacion_id);
    return {
      proy: { ...proy, estadoMostrado: proy.archivado ? "Archivado" : proy.estado },
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

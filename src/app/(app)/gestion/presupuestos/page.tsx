import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos } from "@/lib/finance";
import { PresupuestosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: presupuestos }, { data: proyectos }, { data: costos }, { data: clientes }] = await Promise.all([
    supabase.from("presupuestos").select("*").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre, cliente_id").eq("archivado", false).order("nombre"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
    supabase.from("clientes").select("id, nombre, nit"),
  ]);

  const proyectoNombre = (id: string) => {
    const p = proyectos?.find((p) => p.id === id);
    return p ? `${p.codigo ? p.codigo + " · " : ""}${p.nombre}` : "—";
  };

  const clienteDeProyecto = (proyectoId: string) => {
    const p = proyectos?.find((p) => p.id === proyectoId);
    return clientes?.find((c) => c.id === p?.cliente_id) ?? null;
  };

  const filas = (presupuestos ?? []).map((pre) => {
    const f = calcularPresupuesto(pre);
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
    const cliente = clienteDeProyecto(pre.proyecto_id);
    return { pre, f, control, proyecto: proyectoNombre(pre.proyecto_id), cliente: cliente?.nombre ?? "—", nit: cliente?.nit ?? "—" };
  });

  return <PresupuestosList filas={filas} proyectos={proyectos ?? []} />;
}

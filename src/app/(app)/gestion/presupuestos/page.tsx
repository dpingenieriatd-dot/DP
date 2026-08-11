import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos } from "@/lib/finance";
import { PresupuestosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: presupuestos }, { data: proyectos }, { data: costos }] = await Promise.all([
    supabase.from("presupuestos").select("*").order("created_at", { ascending: false }),
    supabase.from("proyectos").select("id, codigo, nombre").eq("archivado", false).order("nombre"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
  ]);

  const proyectoNombre = (id: string) => {
    const p = proyectos?.find((p) => p.id === id);
    return p ? `${p.codigo ? p.codigo + " · " : ""}${p.nombre}` : "—";
  };

  const filas = (presupuestos ?? []).map((pre) => {
    const f = calcularPresupuesto(pre);
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
    return { pre, f, control, proyecto: proyectoNombre(pre.proyecto_id) };
  });

  return <PresupuestosList filas={filas} proyectos={proyectos ?? []} />;
}

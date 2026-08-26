import { createClient } from "@/lib/supabase/server";
import { CotizacionesList } from "./list";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: cotizaciones }, { data: clientes }, { data: empresas }, { data: profiles }, { data: proyectos }, { data: presupuestos }, { data: soportes }] =
    await Promise.all([
      supabase.from("cotizaciones").select("*").order("codigo", { ascending: true, nullsFirst: false }),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("empresas_atendidas").select("id, nombre").order("nombre"),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("proyectos").select("codigo, cotizacion_id").not("cotizacion_id", "is", null),
      supabase.from("presupuestos").select("codigo, cotizacion_id").not("cotizacion_id", "is", null),
      supabase.from("cotizacion_soportes").select("cotizacion_id"),
    ]);

  return (
    <CotizacionesList
      cotizaciones={cotizaciones ?? []}
      clientes={clientes ?? []}
      empresas={empresas ?? []}
      profiles={profiles ?? []}
      proyectos={proyectos ?? []}
      presupuestos={presupuestos ?? []}
      soportes={soportes ?? []}
    />
  );
}

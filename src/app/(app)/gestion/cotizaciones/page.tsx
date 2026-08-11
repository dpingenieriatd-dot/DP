import { createClient } from "@/lib/supabase/server";
import { CotizacionesList } from "./list";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: cotizaciones }, { data: clientes }, { data: empresas }, { data: profiles }] = await Promise.all([
    supabase.from("cotizaciones").select("*").order("created_at", { ascending: false }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  return (
    <CotizacionesList
      cotizaciones={cotizaciones ?? []}
      clientes={clientes ?? []}
      empresas={empresas ?? []}
      profiles={profiles ?? []}
    />
  );
}

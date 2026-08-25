import { createClient } from "@/lib/supabase/server";
import { CotizacionForm } from "../cotizacion-form";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: clientes }, { data: empresas }, { data: profiles }] = await Promise.all([
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
  ]);

  return <CotizacionForm editing={null} clientes={clientes ?? []} empresas={empresas ?? []} profiles={profiles ?? []} soportes={[]} />;
}

import { createClient } from "@/lib/supabase/server";
import { CotizacionesList } from "./list";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: cotizaciones }, { data: clientes }] = await Promise.all([
    supabase.from("cotizaciones").select("*").order("created_at", { ascending: false }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  return <CotizacionesList cotizaciones={cotizaciones ?? []} clientes={clientes ?? []} />;
}

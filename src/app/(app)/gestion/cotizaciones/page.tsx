import { createClient } from "@/lib/supabase/server";
import { CotizacionesList } from "./list";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: cotizaciones }, { data: clientes }, { data: empresas }, { data: profiles }, { data: soportes }] = await Promise.all([
    supabase.from("cotizaciones").select("*").order("codigo", { ascending: true, nullsFirst: false }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("cotizacion_soportes").select("*").order("created_at"),
  ]);

  // URL firmada (bucket privado) para cada soporte — de corta duración, se regenera en cada carga de página.
  const paths = (soportes ?? []).map((s) => s.storage_path);
  const { data: firmadas } = paths.length
    ? await supabase.storage.from("cotizacion-soportes").createSignedUrls(paths, 3600)
    : { data: [] as { path?: string; signedUrl: string }[] };
  const urlPorPath = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  const soportesConUrl = (soportes ?? []).map((s) => ({ ...s, url: urlPorPath.get(s.storage_path) ?? null }));

  return (
    <CotizacionesList
      cotizaciones={cotizaciones ?? []}
      clientes={clientes ?? []}
      empresas={empresas ?? []}
      profiles={profiles ?? []}
      soportes={soportesConUrl}
    />
  );
}

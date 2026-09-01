import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CotizacionForm } from "../cotizacion-form";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cotizacion }, { data: clientes }, { data: empresas }, { data: profiles }, { data: soportes }, { data: insumos }, { data: profesionales }, { data: materiales }, { data: items }] =
    await Promise.all([
      supabase.from("cotizaciones").select("*").eq("id", id).single(),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("cotizacion_soportes").select("*").eq("cotizacion_id", id).order("created_at"),
      supabase.from("insumos").select("id, codigo, descripcion, unidad, costo").eq("estado", "Activo").order("descripcion"),
      supabase.from("profesionales").select("id, nombre, perfil, tarifa_hora").eq("estado", "Activo").order("nombre"),
      supabase.from("materiales").select("id, codigo, nombre, valor_reposicion, vida_util_jornadas").neq("estado", "Dado de baja").order("nombre"),
      supabase.from("cotizacion_items").select("*").eq("cotizacion_id", id).order("orden"),
    ]);

  if (!cotizacion) notFound();

  const paths = (soportes ?? []).map((s) => s.storage_path);
  const { data: firmadas } = paths.length
    ? await supabase.storage.from("cotizacion-soportes").createSignedUrls(paths, 3600)
    : { data: [] as { path?: string; signedUrl: string }[] };
  const urlPorPath = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));
  const soportesConUrl = (soportes ?? []).map((s) => ({ ...s, url: urlPorPath.get(s.storage_path) ?? null }));

  return (
    <CotizacionForm
      editing={cotizacion}
      clientes={clientes ?? []}
      empresas={empresas ?? []}
      profiles={profiles ?? []}
      soportes={soportesConUrl}
      insumos={insumos ?? []}
      profesionales={profesionales ?? []}
      materiales={materiales ?? []}
      itemsIniciales={items ?? []}
    />
  );
}

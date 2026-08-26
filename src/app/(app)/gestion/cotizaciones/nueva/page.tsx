import { createClient } from "@/lib/supabase/server";
import { CotizacionForm } from "../cotizacion-form";

export default async function Page() {
  const supabase = await createClient();
  const [{ data: clientes }, { data: empresas }, { data: profiles }, { data: insumos }, { data: profesionales }, { data: materiales }] = await Promise.all([
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    supabase.from("profiles").select("id, full_name, email").order("full_name"),
    supabase.from("insumos").select("id, codigo, descripcion, unidad, costo").eq("estado", "Activo").order("descripcion"),
    supabase.from("profesionales").select("id, codigo, nombre, perfil, tarifa_hora").eq("estado", "Activo").order("nombre"),
    supabase.from("materiales").select("id, codigo, nombre, valor_reposicion, vida_util_jornadas").neq("estado", "Dado de baja").order("nombre"),
  ]);

  return (
    <CotizacionForm
      editing={null}
      clientes={clientes ?? []}
      empresas={empresas ?? []}
      profiles={profiles ?? []}
      soportes={[]}
      insumos={insumos ?? []}
      profesionales={profesionales ?? []}
      materiales={materiales ?? []}
      itemsIniciales={[]}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { ComprasList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: compras }, { data: proyectos }, { data: proveedores }, { data: insumos }, { data: clientes }] = await Promise.all([
    supabase.from("compras").select("*").eq("archivado", false).order("fecha", { ascending: false }),
    supabase.from("proyectos").select("id, codigo, nombre, cliente_id").eq("archivado", false).order("nombre"),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    supabase.from("insumos").select("id, descripcion, unidad, costo").order("descripcion"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
  ]);

  return (
    <ComprasList
      compras={compras ?? []}
      proyectos={proyectos ?? []}
      proveedores={proveedores ?? []}
      insumos={insumos ?? []}
      clientes={clientes ?? []}
    />
  );
}

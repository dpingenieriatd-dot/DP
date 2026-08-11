import { createClient } from "@/lib/supabase/server";
import { calcularFinanzas } from "@/lib/finance";
import { ProyectosList } from "./list";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: proyectos }, { data: clientes }, { data: profiles }, { data: compras }, { data: settings }] =
    await Promise.all([
      supabase.from("proyectos").select("*").eq("archivado", false).order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("compras").select("proyecto_id, cantidad, valor_unitario"),
      supabase.from("settings").select("admin_pct").eq("id", 1).single(),
    ]);

  const clienteNombre = (id: string | null) => clientes?.find((c) => c.id === id)?.nombre ?? "—";
  const responsableNombre = (id: string | null) => {
    const p = profiles?.find((p) => p.id === id);
    return p?.full_name || p?.email || "—";
  };

  const filas = (proyectos ?? []).map((proy) => {
    const comprasProyecto = (compras ?? [])
      .filter((c) => c.proyecto_id === proy.id)
      .reduce((a, c) => a + Number(c.cantidad) * Number(c.valor_unitario), 0);
    const f = calcularFinanzas(proy, Number(settings?.admin_pct ?? 15), comprasProyecto);
    return { proy, f, cliente: clienteNombre(proy.cliente_id), responsable: responsableNombre(proy.responsable_id) };
  });

  return (
    <ProyectosList
      filas={filas}
      clientes={clientes ?? []}
      profiles={profiles ?? []}
    />
  );
}

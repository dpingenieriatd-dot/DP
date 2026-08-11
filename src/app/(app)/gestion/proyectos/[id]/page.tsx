import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularFinanzas } from "@/lib/finance";
import { ProyectoDetalle } from "./detalle";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: proyecto }, { data: clientes }, { data: profiles }, { data: items }, { data: compras }, { data: settings }] =
    await Promise.all([
      supabase.from("proyectos").select("*").eq("id", id).single(),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("profiles").select("id, full_name, email").order("full_name"),
      supabase.from("presupuesto_items").select("*").eq("proyecto_id", id).order("created_at"),
      supabase.from("compras").select("*").eq("proyecto_id", id).order("fecha", { ascending: false }),
      supabase.from("settings").select("admin_pct").eq("id", 1).single(),
    ]);

  if (!proyecto) notFound();

  const comprasTotal = (compras ?? []).reduce((a, c) => a + Number(c.cantidad) * Number(c.valor_unitario), 0);
  const finanzas = calcularFinanzas(proyecto, Number(settings?.admin_pct ?? 15), comprasTotal);

  return (
    <ProyectoDetalle
      proyecto={proyecto}
      clientes={clientes ?? []}
      profiles={profiles ?? []}
      items={items ?? []}
      compras={compras ?? []}
      finanzas={finanzas}
    />
  );
}

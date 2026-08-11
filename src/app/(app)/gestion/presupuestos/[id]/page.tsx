import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos } from "@/lib/finance";
import { PresupuestoDetalle } from "./detalle";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: presupuesto }, { data: costos }] = await Promise.all([
    supabase.from("presupuestos").select("*, proyectos(id, codigo, nombre)").eq("id", id).single(),
    supabase.from("presupuesto_costos").select("*").eq("presupuesto_id", id).order("created_at"),
  ]);

  if (!presupuesto) notFound();

  const f = calcularPresupuesto(presupuesto);
  const control = calcularControlCostos(costos ?? [], f.valorCotizado, f.admin, f.iva);

  return <PresupuestoDetalle presupuesto={presupuesto} costos={costos ?? []} f={f} control={control} />;
}

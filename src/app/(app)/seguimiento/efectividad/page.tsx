import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { requiereAdmin } from "@/lib/auth";
import { EfectividadList } from "./list";

export default async function Page() {
  const supabase = await createClient();
  const filtro = await getResponsableFiltro();

  let query = supabase
    .from("tareas")
    .select("id, titulo, responsable, fecha_cierre, horas_reales, calidad_pct")
    .eq("estado", "Terminada")
    .is("responsable_externo_id", null)
    .order("fecha_cierre", { ascending: false });
  if (filtro) query = query.eq("responsable", filtro);

  const [{ data: tareas }, { data: profiles }, isAdmin, userLabel] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name, email"),
    requiereAdmin(),
    getCurrentProfileLabel(),
  ]);

  return <EfectividadList tareas={tareas ?? []} profiles={profiles ?? []} isAdmin={isAdmin} userLabel={userLabel} filtro={filtro} />;
}

import { createClient } from "@/lib/supabase/server";
import { semanaActual, toISODate } from "@/lib/week";
import { AgendaGrid } from "./grid";

export default async function Page() {
  const supabase = await createClient();
  const semana = semanaActual();
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[6]);

  const [{ data: profiles }, { data: bloques }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, capacidad_semanal_horas").order("full_name"),
    supabase
      .from("agenda_bloques")
      .select("*")
      .gte("dia", desde)
      .lte("dia", hasta)
      .order("hora_inicio"),
  ]);

  return (
    <AgendaGrid
      profiles={profiles ?? []}
      bloques={bloques ?? []}
      dias={semana.map((d) => toISODate(d))}
    />
  );
}

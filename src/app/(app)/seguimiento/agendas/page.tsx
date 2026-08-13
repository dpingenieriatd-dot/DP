import { createClient } from "@/lib/supabase/server";
import { semanaActual, toISODate } from "@/lib/week";
import { AgendaGrid } from "./grid";

export default async function Page() {
  const supabase = await createClient();
  const semana = semanaActual();
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[6]);

  const [{ data: profiles }, { data: clientes }, { data: proyectos }, { data: bloques }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, capacidad_semanal_horas").order("full_name"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
    supabase
      .from("agenda_bloques")
      .select("*, clientes(nombre), proyectos(nombre)")
      .gte("dia", desde)
      .lte("dia", hasta)
      .order("hora_inicio"),
  ]);

  return (
    <AgendaGrid
      profiles={profiles ?? []}
      clientes={clientes ?? []}
      proyectos={proyectos ?? []}
      bloques={bloques ?? []}
      dias={semana.map((d) => toISODate(d))}
    />
  );
}

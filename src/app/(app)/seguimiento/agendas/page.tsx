import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { semanaActual, toISODate } from "@/lib/week";
import { AgendaGrid } from "./grid";

export default async function Page() {
  const supabase = await createClient();
  const semana = semanaActual();
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[6]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: clientes }, { data: proyectos }, { data: bloques }, { data: miPerfil }, { data: timerActivo }, userLabel] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, email, capacidad_semanal_horas").order("full_name"),
      supabase.from("clientes").select("id, nombre").order("nombre"),
      supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
      supabase
        .from("agenda_bloques")
        .select("*, clientes(nombre), proyectos(nombre), tareas(id, estado, responsable)")
        .gte("dia", desde)
        .lte("dia", hasta)
        .order("hora_inicio"),
      user
        ? supabase.from("profiles").select("recordatorio_minutos_antes, recordatorio_sonido").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("registros_tiempo")
            .select("id, tarea_id, inicio")
            .eq("usuario_id", user.id)
            .is("fin", null)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      getCurrentProfileLabel(),
    ]);

  return (
    <AgendaGrid
      profiles={profiles ?? []}
      clientes={clientes ?? []}
      proyectos={proyectos ?? []}
      bloques={bloques ?? []}
      dias={semana.map((d) => toISODate(d))}
      recordatorioMinutos={miPerfil?.recordatorio_minutos_antes ?? 15}
      recordatorioSonido={miPerfil?.recordatorio_sonido ?? true}
      currentUserId={user?.id ?? null}
      timerActivo={timerActivo ?? null}
      userLabel={userLabel}
    />
  );
}

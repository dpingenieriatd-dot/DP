import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { semanaActual, toISODate, shortDay } from "@/lib/week";
import { AgendaGrid } from "./grid";

export default async function Page({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana: semanaParam } = await searchParams;
  const offset = Number.isFinite(Number(semanaParam)) ? Math.trunc(Number(semanaParam)) : 0;
  const supabase = await createClient();
  const ref = new Date();
  ref.setDate(ref.getDate() + offset * 7);
  const semana = semanaActual(ref);
  const desde = toISODate(semana[0]);
  const hasta = toISODate(semana[6]);
  const diasLabel = semana.map(shortDay);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: bloques }, { data: miPerfil }, { data: timerActivo }, userLabel, filtro, { data: registrosAbiertos }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, email, capacidad_semanal_horas").order("full_name"),
      supabase
        .from("agenda_bloques")
        .select("*, clientes(nombre), proyectos(nombre), tareas(id, estado, responsable, horas_reales)")
        .gte("dia", desde)
        .lte("dia", hasta)
        .order("hora_inicio"),
      user
        ? supabase.from("profiles").select("recordatorio_minutos_antes, recordatorio_sonido, role").eq("id", user.id).single()
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
      getResponsableFiltro(),
      supabase.from("registros_tiempo").select("id, tarea_id, inicio").is("fin", null),
    ]);

  const profilesFiltrados = filtro ? (profiles ?? []).filter((p) => p.id === filtro) : profiles ?? [];
  const bloquesFiltrados = filtro ? (bloques ?? []).filter((b) => b.usuario_id === filtro) : bloques ?? [];

  return (
    <AgendaGrid
      profiles={profilesFiltrados}
      bloques={bloquesFiltrados}
      dias={semana.map((d) => toISODate(d))}
      diasLabel={diasLabel}
      offsetSemana={offset}
      recordatorioMinutos={miPerfil?.recordatorio_minutos_antes ?? 15}
      recordatorioSonido={miPerfil?.recordatorio_sonido ?? true}
      currentUserId={user?.id ?? null}
      timerActivo={timerActivo ?? null}
      userLabel={userLabel}
      todosLosProfiles={profiles ?? []}
      filtro={filtro}
      isAdmin={miPerfil?.role === "admin"}
      registrosAbiertos={registrosAbiertos ?? []}
    />
  );
}

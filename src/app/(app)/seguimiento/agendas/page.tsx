import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { getDirectorioSeguimiento, conNombres } from "@/lib/directorio-seguimiento";
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

  const [dir, { data: bloques }, { data: miPerfil }, { data: timerActivo }, userLabel, filtro] =
    await Promise.all([
      // Perfiles, nombres de cliente/proyecto y cronómetros abiertos de todos vía servidor
      // (ver directorio-seguimiento.ts).
      getDirectorioSeguimiento(),
      supabase
        .from("agenda_bloques")
        .select("*, tareas(id, estado, responsable, horas_reales)")
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
    ]);

  const profiles = dir.profiles;
  const conCliente = conNombres(bloques ?? [], dir);
  const profilesFiltrados = filtro ? profiles.filter((p) => p.id === filtro) : profiles;
  const bloquesFiltrados = filtro ? conCliente.filter((b) => b.usuario_id === filtro) : conCliente;

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
      todosLosProfiles={profiles}
      filtro={filtro}
      isAdmin={miPerfil?.role === "admin"}
      registrosAbiertos={dir.registrosAbiertos}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { getDirectorioSeguimiento, conNombres } from "@/lib/directorio-seguimiento";
import { TaskBoard } from "./board";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tareas },
    dir,
    { data: actividadesCatalogo },
    { data: procesos },
    { data: timerActivo },
    { data: miPerfil },
    userLabel,
    filtro,
    { data: agendaBloques },
  ] = await Promise.all([
    supabase.from("tareas").select("*").order("created_at", { ascending: false }),
    // Clientes, proyectos (sin archivados ni rechazados), empresas, profesionales, perfiles y
    // cronómetros abiertos de todos -- vía servidor, ver directorio-seguimiento.ts.
    getDirectorioSeguimiento(),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido").order("codigo"),
    supabase.from("procesos").select("codigo, nombre").order("codigo"),
    user
      ? supabase
          .from("registros_tiempo")
          .select("id, tarea_id, inicio")
          .eq("usuario_id", user.id)
          .is("fin", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).single() : Promise.resolve({ data: null }),
    getCurrentProfileLabel(),
    getResponsableFiltro(),
    supabase.from("agenda_bloques").select("tarea_id, dia, hora_inicio"),
  ]);

  const todas = conNombres(tareas ?? [], dir);
  const tareasFiltradas = filtro ? todas.filter((t) => t.responsable === filtro) : todas;

  return (
    <TaskBoard
      tareas={tareasFiltradas}
      filtro={filtro}
      profiles={dir.profiles}
      clientes={dir.clientes}
      proyectos={dir.proyectosActivos}
      empresas={dir.empresas}
      actividadesCatalogo={actividadesCatalogo ?? []}
      procesos={procesos ?? []}
      profesionales={dir.profesionalesActivos}
      currentUserId={user?.id ?? null}
      timerActivo={timerActivo ?? null}
      // Cronómetros abiertos de CUALQUIER persona — para mostrar el tiempo real corriendo en
      // cualquier tarjeta "En proceso", sin importar quién la esté viendo (igual que el HTML).
      registrosAbiertos={dir.registrosAbiertos}
      agendaBloques={agendaBloques ?? []}
      isAdmin={miPerfil?.role === "admin"}
      userLabel={userLabel}
    />
  );
}

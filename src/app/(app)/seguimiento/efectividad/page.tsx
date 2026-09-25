import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { getDirectorioSeguimiento, conNombres } from "@/lib/directorio-seguimiento";
import { requiereAdmin } from "@/lib/auth";
import { EfectividadList } from "./list";

export default async function Page() {
  const supabase = await createClient();
  const filtro = await getResponsableFiltro();

  let query = supabase
    .from("tareas")
    .select("*")
    .eq("estado", "Terminada")
    .is("responsable_externo_id", null)
    .order("fecha_cierre", { ascending: false });
  if (filtro) query = query.eq("responsable", filtro);

  const [
    { data: tareas },
    dir,
    { data: procesos },
    { data: actividadesCatalogo },
    { data: agendaBloques },
    isAdmin,
    userLabel,
  ] = await Promise.all([
    query,
    // Perfiles, empresas y nombres de cliente/proyecto vía servidor (ver directorio-seguimiento.ts).
    getDirectorioSeguimiento(),
    supabase.from("procesos").select("codigo, nombre"),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido"),
    supabase.from("agenda_bloques").select("tarea_id, dia, hora_inicio"),
    requiereAdmin(),
    getCurrentProfileLabel(),
  ]);

  return (
    <EfectividadList
      tareas={conNombres(tareas ?? [], dir)}
      profiles={dir.profiles}
      empresas={dir.empresas}
      procesos={procesos ?? []}
      actividadesCatalogo={actividadesCatalogo ?? []}
      agendaBloques={agendaBloques ?? []}
      isAdmin={isAdmin}
      userLabel={userLabel}
      filtro={filtro}
    />
  );
}

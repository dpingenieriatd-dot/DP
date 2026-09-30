import { createClient } from "@/lib/supabase/server";
import { requiereAdmin } from "@/lib/auth";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { getDirectorioSeguimiento, conNombres } from "@/lib/directorio-seguimiento";
import { HistorialList } from "./list";

export default async function HistorialPage({ searchParams }: { searchParams: Promise<{ proceso?: string; responsable?: string }> }) {
  const { proceso, responsable } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const filtroGlobal = await getResponsableFiltro();
  // El enlace "Ver archivadas" de una persona específica (?responsable=) manda sobre el filtro
  // global mientras esté presente en la URL; si no, se respeta el filtro global de la Topbar.
  const responsableEfectivo = responsable || filtroGlobal;

  let query = supabase
    .from("tareas")
    .select("*")
    .eq("estado", "Terminada")
    .order("fecha_cierre", { ascending: false });
  if (proceso) query = query.eq("proceso_codigo", proceso);
  if (responsableEfectivo) query = query.eq("responsable", responsableEfectivo);

  const [
    { data: tareas },
    isAdmin,
    userLabel,
    dir,
    { data: procesos },
    { data: actividadesCatalogo },
    { data: agendaBloques },
    { data: procesoInfo },
  ] = await Promise.all([
    query,
    requiereAdmin(),
    getCurrentProfileLabel(),
    // Perfiles, profesionales, empresas y nombres de cliente/proyecto vía servidor
    // (ver directorio-seguimiento.ts).
    getDirectorioSeguimiento(),
    supabase.from("procesos").select("codigo, nombre"),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido"),
    supabase.from("agenda_bloques").select("tarea_id, dia, hora_inicio"),
    proceso ? supabase.from("procesos").select("nombre").eq("codigo", proceso).single() : Promise.resolve({ data: null }),
  ]);
  const responsableInfo = dir.profiles.find((p) => p.id === responsableEfectivo);

  return (
    <HistorialList
      tareas={conNombres(tareas ?? [], dir)}
      profiles={dir.profiles}
      profesionales={dir.profesionales}
      empresas={dir.empresas}
      procesos={procesos ?? []}
      actividadesCatalogo={actividadesCatalogo ?? []}
      agendaBloques={agendaBloques ?? []}
      isAdmin={isAdmin}
      currentUserId={user?.id ?? null}
      filtroProceso={proceso ? { codigo: proceso, nombre: procesoInfo?.nombre ?? proceso } : null}
      filtroResponsable={responsableEfectivo ? { nombre: responsableInfo?.full_name || responsableInfo?.email || "—" } : null}
      filtroGlobal={filtroGlobal}
      userLabel={userLabel}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { requiereAdmin } from "@/lib/auth";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { HistorialList } from "./list";

export default async function HistorialPage({ searchParams }: { searchParams: Promise<{ proceso?: string; responsable?: string }> }) {
  const { proceso, responsable } = await searchParams;
  const supabase = await createClient();
  const filtroGlobal = await getResponsableFiltro();
  // El enlace "Ver archivadas" de una persona específica (?responsable=) manda sobre el filtro
  // global mientras esté presente en la URL; si no, se respeta el filtro global de la Topbar.
  const responsableEfectivo = responsable || filtroGlobal;

  let query = supabase
    .from("tareas")
    .select("*, clientes(nombre), proyectos(nombre)")
    .eq("estado", "Terminada")
    .order("fecha_cierre", { ascending: false });
  if (proceso) query = query.eq("proceso_codigo", proceso);
  if (responsableEfectivo) query = query.eq("responsable", responsableEfectivo);

  const [
    { data: tareas },
    isAdmin,
    userLabel,
    { data: profiles },
    { data: profesionales },
    { data: empresas },
    { data: procesos },
    { data: actividadesCatalogo },
    { data: agendaBloques },
    { data: procesoInfo },
    { data: responsableInfo },
  ] = await Promise.all([
    query,
    requiereAdmin(),
    getCurrentProfileLabel(),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("profesionales").select("id, nombre, perfil, especialidad, ciudad, correo, telefono"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id"),
    supabase.from("procesos").select("codigo, nombre"),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido"),
    supabase.from("agenda_bloques").select("tarea_id, dia, hora_inicio"),
    proceso ? supabase.from("procesos").select("nombre").eq("codigo", proceso).single() : Promise.resolve({ data: null }),
    responsableEfectivo ? supabase.from("profiles").select("full_name, email").eq("id", responsableEfectivo).single() : Promise.resolve({ data: null }),
  ]);

  return (
    <HistorialList
      tareas={tareas ?? []}
      profiles={profiles ?? []}
      profesionales={profesionales ?? []}
      empresas={empresas ?? []}
      procesos={procesos ?? []}
      actividadesCatalogo={actividadesCatalogo ?? []}
      agendaBloques={agendaBloques ?? []}
      isAdmin={isAdmin}
      filtroProceso={proceso ? { codigo: proceso, nombre: procesoInfo?.nombre ?? proceso } : null}
      filtroResponsable={responsableEfectivo ? { nombre: responsableInfo?.full_name || responsableInfo?.email || "—" } : null}
      filtroGlobal={filtroGlobal}
      userLabel={userLabel}
    />
  );
}

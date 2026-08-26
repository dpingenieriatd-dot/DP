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

  const [{ data: tareas }, isAdmin, userLabel, {
    data: { user },
  }, { data: profiles }, { data: profesionales }, { data: procesoInfo }, { data: responsableInfo }] = await Promise.all([
    query,
    requiereAdmin(),
    getCurrentProfileLabel(),
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("profesionales").select("id, nombre, perfil"),
    proceso ? supabase.from("procesos").select("nombre").eq("codigo", proceso).single() : Promise.resolve({ data: null }),
    responsableEfectivo ? supabase.from("profiles").select("full_name, email").eq("id", responsableEfectivo).single() : Promise.resolve({ data: null }),
  ]);

  return (
    <HistorialList
      tareas={tareas ?? []}
      profiles={profiles ?? []}
      profesionales={profesionales ?? []}
      isAdmin={isAdmin}
      currentUserId={user?.id ?? null}
      filtroProceso={proceso ? { codigo: proceso, nombre: procesoInfo?.nombre ?? proceso } : null}
      filtroResponsable={responsableEfectivo ? { nombre: responsableInfo?.full_name || responsableInfo?.email || "—" } : null}
      filtroGlobal={filtroGlobal}
      userLabel={userLabel}
    />
  );
}

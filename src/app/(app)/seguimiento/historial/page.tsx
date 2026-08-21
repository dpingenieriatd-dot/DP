import { createClient } from "@/lib/supabase/server";
import { requiereAdmin } from "@/lib/auth";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { HistorialList } from "./list";

export default async function HistorialPage({ searchParams }: { searchParams: Promise<{ proceso?: string }> }) {
  const { proceso } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("tareas")
    .select("*, clientes(nombre), proyectos(nombre)")
    .eq("estado", "Terminada")
    .order("fecha_cierre", { ascending: false });
  if (proceso) query = query.eq("proceso_codigo", proceso);

  const [{ data: tareas }, isAdmin, userLabel, {
    data: { user },
  }, { data: profiles }, { data: procesoInfo }] = await Promise.all([
    query,
    requiereAdmin(),
    getCurrentProfileLabel(),
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, full_name, email"),
    proceso ? supabase.from("procesos").select("nombre").eq("codigo", proceso).single() : Promise.resolve({ data: null }),
  ]);

  return (
    <HistorialList
      tareas={tareas ?? []}
      profiles={profiles ?? []}
      isAdmin={isAdmin}
      currentUserId={user?.id ?? null}
      filtroProceso={proceso ? { codigo: proceso, nombre: procesoInfo?.nombre ?? proceso } : null}
      userLabel={userLabel}
    />
  );
}

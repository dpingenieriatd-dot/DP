import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { TaskBoard } from "./board";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tareas },
    { data: profiles },
    { data: clientes },
    { data: proyectos },
    { data: empresas },
    { data: actividadesCatalogo },
    { data: timerActivo },
    { data: miPerfil },
    userLabel,
  ] = await Promise.all([
    supabase.from("tareas").select("*, clientes(nombre), proyectos(nombre)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre").order("nombre"),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido").order("codigo"),
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
  ]);

  return (
    <TaskBoard
      tareas={tareas ?? []}
      profiles={profiles ?? []}
      clientes={clientes ?? []}
      proyectos={proyectos ?? []}
      empresas={empresas ?? []}
      actividadesCatalogo={actividadesCatalogo ?? []}
      currentUserId={user?.id ?? null}
      timerActivo={timerActivo ?? null}
      isAdmin={miPerfil?.role === "admin"}
      userLabel={userLabel}
    />
  );
}

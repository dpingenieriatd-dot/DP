import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
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
    { data: procesos },
    { data: profesionales },
    { data: timerActivo },
    { data: miPerfil },
    userLabel,
    filtro,
    { data: registrosAbiertos },
    { data: agendaBloques },
  ] = await Promise.all([
    supabase.from("tareas").select("*, clientes(nombre), proyectos(nombre)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido").order("codigo"),
    supabase.from("procesos").select("codigo, nombre").order("codigo"),
    supabase.from("profesionales").select("id, nombre, perfil, especialidad, ciudad, correo, telefono").eq("estado", "Activo").order("nombre"),
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
    // Cronómetros abiertos de CUALQUIER persona — para mostrar el tiempo real corriendo en
    // cualquier tarjeta "En proceso", sin importar quién la esté viendo (igual que el HTML).
    supabase.from("registros_tiempo").select("id, tarea_id, inicio").is("fin", null),
    supabase.from("agenda_bloques").select("tarea_id, dia, hora_inicio"),
  ]);

  const tareasFiltradas = filtro ? (tareas ?? []).filter((t) => t.responsable === filtro) : tareas ?? [];

  return (
    <TaskBoard
      tareas={tareasFiltradas}
      filtro={filtro}
      profiles={profiles ?? []}
      clientes={clientes ?? []}
      proyectos={proyectos ?? []}
      empresas={empresas ?? []}
      actividadesCatalogo={actividadesCatalogo ?? []}
      procesos={procesos ?? []}
      profesionales={profesionales ?? []}
      currentUserId={user?.id ?? null}
      timerActivo={timerActivo ?? null}
      registrosAbiertos={registrosAbiertos ?? []}
      agendaBloques={agendaBloques ?? []}
      isAdmin={miPerfil?.role === "admin"}
      userLabel={userLabel}
    />
  );
}

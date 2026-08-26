import { createClient } from "@/lib/supabase/server";
import { getCurrentProfileLabel } from "@/lib/current-profile";
import { getResponsableFiltro } from "@/lib/responsable-filtro";
import { requiereAdmin } from "@/lib/auth";
import { esActividad, resultadoActividad } from "@/lib/actividad-tarea";
import { KpiCard } from "@/components/kpi-card";
import { Topbar } from "@/components/topbar";
import { ResponsableFiltro } from "@/components/responsable-filtro";
import { ActividadesList } from "./list";

export default async function Page({ searchParams }: { searchParams: Promise<{ cargo?: string }> }) {
  const { cargo: cargoFiltro } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: tareas },
    { data: clientes },
    { data: proyectos },
    { data: empresas },
    { data: actividadesCatalogo },
    { data: procesos },
    { data: profiles },
    { data: profesionales },
    { data: agendaBloques },
    userLabel,
    filtro,
    isAdmin,
  ] = await Promise.all([
    supabase.from("tareas").select("*, clientes(nombre), proyectos(nombre)").order("created_at", { ascending: false }),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("proyectos").select("id, codigo, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    supabase.from("catalogo_actividades").select("id, codigo, subproceso, descripcion, responsable_sugerido").order("codigo"),
    supabase.from("procesos").select("codigo, nombre").order("codigo"),
    supabase.from("profiles").select("id, full_name, email, cargo"),
    supabase.from("profesionales").select("id, nombre, perfil, especialidad, ciudad, correo, telefono").eq("estado", "Activo").order("nombre"),
    supabase.from("agenda_bloques").select("tarea_id, dia, hora_inicio"),
    getCurrentProfileLabel(),
    getResponsableFiltro(),
    requiereAdmin(),
  ]);

  const cargoDe = (t: { responsable: string | null; responsable_externo_id: string | null }) => {
    if (t.responsable_externo_id) return "Profesional externo";
    const p = profiles?.find((p) => p.id === t.responsable);
    return p?.cargo || "Sin asignar";
  };

  const todas = (tareas ?? []).filter((t) => !filtro || t.responsable === filtro).filter(esActividad);
  const items = todas
    .filter((t) => !cargoFiltro || cargoDe(t) === cargoFiltro)
    .map((t) => ({ ...t, _cargo: cargoDe(t), _fecha: t.fecha_cierre || t.fecha_toma || t.created_at?.slice(0, 10) || "" }))
    .sort((a, b) => b._fecha.localeCompare(a._fecha));

  const resultados = items.map(resultadoActividad);
  const cumplidas = resultados.filter((r) => r === "Cumplida").length;
  const pendientes = resultados.filter((r) => r === "Pendiente/Parcial").length;
  const noCumplidas = resultados.filter((r) => r === "No cumplida").length;

  return (
    <div className="flex flex-col lg:h-full">
      <Topbar
        title="Actividades"
        subtitle="La tabla y los contadores se actualizan según el cargo seleccionado."
        userLabel={userLabel ?? undefined}
        filter={<ResponsableFiltro profiles={profiles ?? []} value={filtro} />}
      />
      <div className="px-8 pt-6">
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Cumplidas" value={cumplidas} color="emerald" />
          <KpiCard label="Pendientes / parciales" value={pendientes} color="amber" />
          <KpiCard label="No cumplidas" value={noCumplidas} color="red" />
        </div>
      </div>
      <div className="lg:min-h-0 lg:flex-1">
        <ActividadesList
          items={items}
          clientes={clientes ?? []}
          proyectos={proyectos ?? []}
          empresas={empresas ?? []}
          actividadesCatalogo={actividadesCatalogo ?? []}
          procesos={procesos ?? []}
          profiles={profiles ?? []}
          profesionales={profesionales ?? []}
          agendaBloques={agendaBloques ?? []}
          currentUserId={user?.id ?? null}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

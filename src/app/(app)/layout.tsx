import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./shell";

const NAV = [
  {
    section: "Fase de seguimiento",
    module: "seguimiento" as const,
    items: [
      { href: "/seguimiento", label: "Inicio" },
      { href: "/seguimiento/tareas", label: "Banco de tareas" },
      { href: "/seguimiento/actividades", label: "Actividades" },
      { href: "/seguimiento/historial", label: "Finalizadas y archivadas" },
      { href: "/seguimiento/agendas", label: "Agenda" },
      { href: "/seguimiento/efectividad", label: "Efectividad" },
      { href: "/seguimiento/capacidad", label: "Equipo" },
      { href: "/seguimiento/procesos", label: "Procesos" },
    ],
  },
  {
    section: "Gestión",
    module: "gestion" as const,
    items: [
      { href: "/gestion", label: "Inicio", subsection: "Panel principal", icon: "home" as const },
      { href: "/gestion/cotizaciones", label: "Cotizaciones", subsection: "Panel principal", icon: "file-text" as const },
      { href: "/gestion/proyectos", label: "Proyectos", subsection: "Panel principal", icon: "folder" as const },
      { href: "/gestion/presupuestos", label: "Presupuestos", subsection: "Panel principal", icon: "calculator" as const },
      { href: "/gestion/compras", label: "Compras", subsection: "Panel principal", icon: "shopping-cart" as const },
      { href: "/gestion/clientes", label: "Clientes", subsection: "Catálogos", icon: "users" as const },
      { href: "/gestion/empresas", label: "Empresas atendidas", subsection: "Catálogos", icon: "building-2" as const },
      { href: "/gestion/proveedores", label: "Proveedores", subsection: "Catálogos", icon: "truck" as const },
      { href: "/gestion/insumos", label: "Banco de insumos", subsection: "Catálogos", icon: "package" as const },
      { href: "/gestion/materiales", label: "Inventario materiales", subsection: "Catálogos", icon: "wrench" as const },
      { href: "/gestion/profesionales", label: "Profesionales", subsection: "Catálogos", icon: "id-card" as const },
    ],
  },
  {
    section: "Reportes",
    module: null,
    items: [{ href: "/reportes", label: "Panel de reportes" }],
  },
  {
    section: "Administración",
    adminOnly: true,
    items: [
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/parametros", label: "Parámetros" },
      { href: "/admin/temas", label: "Temas" },
      { href: "/admin/auditoria", label: "Auditoría" },
      { href: "/admin/soporte", label: "Soporte técnico" },
    ],
  },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null; role: string; modules: string[]; cargo: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role, modules, cargo")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isAdmin = profile?.role === "admin";
  const modules = profile?.modules ?? [];
  const visibleNav = NAV.filter((group) => {
    if (isAdmin) return true;
    if ("adminOnly" in group && group.adminOnly) return false;
    if (group.module) return modules.includes(group.module);
    return modules.length > 0; // Reportes: visible si tiene acceso a algún módulo
  });

  return (
    <AppShell userEmail={user?.email ?? null} profile={profile} visibleNav={visibleNav}>
      {children}
    </AppShell>
  );
}

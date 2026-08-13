import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./shell";

const NAV = [
  {
    section: "Seguimiento",
    module: "seguimiento" as const,
    items: [
      { href: "/seguimiento/tareas", label: "Banco de tareas" },
      { href: "/seguimiento/actividades", label: "Actividades" },
      { href: "/seguimiento/agendas", label: "Agendas" },
      { href: "/seguimiento/capacidad", label: "Capacidad del equipo" },
      { href: "/seguimiento/efectividad", label: "Efectividad" },
    ],
  },
  {
    section: "Gestión",
    module: "gestion" as const,
    items: [
      { href: "/gestion/cotizaciones", label: "Cotizaciones" },
      { href: "/gestion/proyectos", label: "Proyectos" },
      { href: "/gestion/presupuestos", label: "Presupuestos" },
      { href: "/gestion/compras", label: "Compras" },
      { href: "/gestion/proveedores", label: "Proveedores" },
      { href: "/gestion/clientes", label: "Clientes" },
      { href: "/gestion/empresas", label: "Empresas atendidas" },
      { href: "/gestion/materiales", label: "Materiales de trabajo" },
      { href: "/gestion/profesionales", label: "Profesionales" },
      { href: "/gestion/insumos", label: "Banco de insumos" },
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
    ],
  },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string | null; role: string; modules: string[] } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role, modules")
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

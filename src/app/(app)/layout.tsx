import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/lib/supabase/logout-button";

const NAV = [
  {
    section: "Seguimiento",
    items: [
      { href: "/seguimiento/tareas", label: "Banco de tareas" },
      { href: "/seguimiento/agendas", label: "Agendas" },
      { href: "/seguimiento/capacidad", label: "Capacidad del equipo" },
      { href: "/seguimiento/efectividad", label: "Efectividad" },
    ],
  },
  {
    section: "Gestión",
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
    section: "Administración",
    items: [
      { href: "/admin/usuarios", label: "Usuarios" },
      { href: "/admin/parametros", label: "Parámetros" },
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

  return (
    <div className="grid h-screen grid-cols-[240px_1fr]">
      <aside className="flex h-screen flex-col overflow-hidden bg-emerald-950 py-5 text-white">
        <div className="border-b border-white/15 px-5 pb-4">
          <div className="mb-3 w-1/2 rounded-md bg-white p-2">
            <Image src="/logo-dp.png" alt="D&P Ingeniería Integral" width={327} height={233} className="h-auto w-full" priority />
          </div>
          <div className="text-xs text-white/60">Plataforma interna</div>
          {user && (
            <div className="mt-3 text-xs text-white/80">
              <div className="font-medium">{profile?.full_name || user.email}</div>
              <div className="text-white/50">
                {profile?.role === "admin" ? "Administrador" : (profile?.modules?.join(", ") || "Sin módulos asignados")}
              </div>
              <div className="mt-1">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
        <nav className="mt-2 flex-1 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.section} className="mb-3">
              <div className="px-5 pb-1 pt-3 text-[11px] uppercase tracking-wide text-white/50">
                {group.section}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-5 py-2 text-sm text-white/85 hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="h-screen overflow-y-auto bg-neutral-50">{children}</main>
    </div>
  );
}

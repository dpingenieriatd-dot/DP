import Link from "next/link";

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="flex flex-col bg-emerald-950 py-5 text-white">
        <div className="border-b border-white/15 px-5 pb-4">
          <div className="text-sm font-bold">D&amp;P Ingeniería Integral</div>
          <div className="text-xs text-white/60">Plataforma interna</div>
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
      <main className="overflow-auto bg-neutral-50">{children}</main>
    </div>
  );
}

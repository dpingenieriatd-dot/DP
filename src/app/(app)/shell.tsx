"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Folder,
  Calculator,
  ShoppingCart,
  Users,
  Building2,
  Truck,
  Package,
  Wrench,
  IdCard,
  type LucideIcon,
} from "lucide-react";
import { LogoutButton } from "@/lib/supabase/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { AgendaReminderPopup } from "@/components/agenda-reminder-popup";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  "file-text": FileText,
  folder: Folder,
  calculator: Calculator,
  "shopping-cart": ShoppingCart,
  users: Users,
  "building-2": Building2,
  truck: Truck,
  package: Package,
  wrench: Wrench,
  "id-card": IdCard,
};

type NavItem = { href: string; label: string; subsection?: string; icon?: string };
type NavGroup = { section: string; items: NavItem[] };

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function AppShell({
  userEmail,
  profile,
  visibleNav,
  children,
}: {
  userEmail: string | null;
  profile: { full_name: string | null; role: string; modules: string[]; cargo?: string | null } | null;
  visibleNav: NavGroup[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nombreMostrado = profile?.full_name || userEmail || "Usuario";
  const cargoMostrado = profile?.role === "admin" ? "Administrador" : profile?.cargo || (profile?.modules?.join(", ") || "Sin módulos asignados");

  return (
    <div className="lg:grid lg:h-screen lg:grid-cols-[240px_1fr]">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-emerald-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 shrink-0 rounded bg-white p-1">
            <Image src="/logo-dp.png" alt="D&P Ingeniería Integral" width={327} height={233} className="h-auto w-full" priority />
          </div>
          <span className="text-sm font-semibold">D&P · Plataforma interna</span>
        </div>
        <div className="flex items-center gap-1">
          {userEmail && <NotificationBell variant="dark" />}
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md p-2 hover:bg-white/10"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col overflow-hidden bg-emerald-900 py-5 text-white transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-4">
          <div className="w-3/5 rounded-md bg-white p-2">
            <Image src="/logo-dp.png" alt="D&P Ingeniería Integral" width={327} height={233} className="h-auto w-full" priority />
          </div>
          <div className="flex items-center gap-1">
            {userEmail && (
              <div className="hidden lg:block">
                <NotificationBell variant="dark" />
              </div>
            )}
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="rounded-md p-1 text-white/70 hover:bg-white/10 lg:hidden">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {visibleNav.map((group) => {
            const subsecciones = [...new Set(group.items.map((i) => i.subsection).filter(Boolean))] as string[];
            const bloques = subsecciones.length ? subsecciones : [undefined];
            return (
              <div key={group.section} className="mb-3">
                <div className="px-5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-white/50">{group.section}</div>
                {bloques.map((sub) => (
                  <div key={sub ?? "_flat"}>
                    {sub && <div className="px-5 pb-1 pt-3 text-[10px] uppercase tracking-wide text-white/40">{sub}</div>}
                    {group.items
                      .filter((i) => i.subsection === sub)
                      .map((item) => {
                        const activo = pathname === item.href || (item.href !== "/gestion" && item.href !== "/seguimiento" && pathname?.startsWith(item.href + "/"));
                        const Icon = item.icon ? ICONS[item.icon] : undefined;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2 px-5 py-2 text-sm ${
                              activo ? "bg-emerald-800/80 font-semibold text-white" : "text-white/85 hover:bg-white/5"
                            }`}
                          >
                            {Icon && <Icon size={16} className="shrink-0" />}
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                  </div>
                ))}
              </div>
            );
          })}
        </nav>

        {userEmail && (
          <div className="border-t border-white/15 px-5 pt-3 text-xs text-white/80">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-semibold text-white">
                {iniciales(nombreMostrado)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{nombreMostrado}</div>
                <div className="truncate text-white/50">{cargoMostrado}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Link href="/cuenta/password" className="text-xs text-white/60 hover:text-white hover:underline" onClick={() => setOpen(false)}>
                Cambiar contraseña
              </Link>
              <span className="text-white/30">·</span>
              <LogoutButton />
            </div>
          </div>
        )}
      </aside>

      <main className="bg-neutral-50 lg:h-screen lg:overflow-y-auto">{children}</main>

      {userEmail && <AgendaReminderPopup />}
      {userEmail && <PresenceHeartbeat />}
    </div>
  );
}

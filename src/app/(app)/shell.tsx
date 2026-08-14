"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogoutButton } from "@/lib/supabase/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { AgendaReminderPopup } from "@/components/agenda-reminder-popup";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";

type NavItem = { href: string; label: string };
type NavGroup = { section: string; items: NavItem[] };

export function AppShell({
  userEmail,
  profile,
  visibleNav,
  children,
}: {
  userEmail: string | null;
  profile: { full_name: string | null; role: string; modules: string[] } | null;
  visibleNav: NavGroup[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

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
        <div className="border-b border-white/15 px-5 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="w-1/2 rounded-md bg-white p-2">
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
          <div className="text-xs text-white/60">Plataforma interna</div>
          {userEmail && (
            <div className="mt-3 text-xs text-white/80">
              <div className="font-medium">{profile?.full_name || userEmail}</div>
              <div className="text-white/50">
                {profile?.role === "admin" ? "Administrador" : (profile?.modules?.join(", ") || "Sin módulos asignados")}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Link href="/cuenta/password" className="text-xs text-white/60 hover:text-white hover:underline" onClick={() => setOpen(false)}>
                  Cambiar contraseña
                </Link>
                <span className="text-white/30">·</span>
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
        <nav className="mt-2 flex-1 overflow-y-auto">
          <Link href="/" onClick={() => setOpen(false)} className="block px-5 py-2 text-sm font-semibold text-white/95 hover:bg-white/5">
            Inicio
          </Link>
          {visibleNav.map((group) => (
            <div key={group.section} className="mb-3">
              <div className="px-5 pb-1 pt-3 text-[11px] uppercase tracking-wide text-white/50">{group.section}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-2 text-sm text-white/85 hover:bg-white/5"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="bg-neutral-50 lg:h-screen lg:overflow-y-auto">{children}</main>

      {userEmail && <AgendaReminderPopup />}
      {userEmail && <PresenceHeartbeat />}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ANCHO_PANEL = 340;

type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  enlace: string | null;
  leida: boolean;
  created_at: string;
};

const INTERVALO_POLL_MS = 30_000;

function haceTiempo(iso: string) {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return "ahora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const dias = Math.floor(hr / 24);
  return `hace ${dias} d`;
}

export function NotificationBell({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);

  const noLeidas = items.filter((n) => !n.leida).length;

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notificaciones")
      .select("id, tipo, titulo, mensaje, enlace, leida, created_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde Supabase (fetch-on-mount legítimo, no estado derivado)
    cargar();
    const id = setInterval(cargar, INTERVALO_POLL_MS);
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      const t = e.target as Node;
      if (contenedorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setAbierto(false);
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  function alternar() {
    if (!abierto && botonRef.current) {
      const r = botonRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.right - ANCHO_PANEL, window.innerWidth - ANCHO_PANEL - 8));
      setPos({ top: r.bottom + 8, left });
    }
    setAbierto((v) => !v);
  }

  async function marcarLeida(n: Notificacion) {
    if (n.leida) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    const supabase = createClient();
    await supabase.from("notificaciones").update({ leida: true }).eq("id", n.id);
  }

  async function marcarTodasLeidas() {
    const pendientes = items.filter((n) => !n.leida);
    if (!pendientes.length) return;
    setItems((prev) => prev.map((x) => ({ ...x, leida: true })));
    const supabase = createClient();
    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .in(
        "id",
        pendientes.map((n) => n.id),
      );
  }

  const iconColor = variant === "dark" ? "text-white/90 hover:bg-white/10" : "text-neutral-600 hover:bg-neutral-100";

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        onClick={alternar}
        aria-label="Notificaciones"
        className={`relative rounded-md p-2 ${iconColor}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 12 6 8Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: ANCHO_PANEL }}
            className="z-[100] max-w-[85vw] rounded-xl border border-neutral-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <span className="text-sm font-semibold text-neutral-800">Notificaciones</span>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas} className="text-xs font-medium text-emerald-700 hover:underline">
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-neutral-400">Sin notificaciones todavía.</p>}
              {items.map((n) => {
                const contenido = (
                  <div
                    className={`flex gap-2 border-b border-neutral-50 px-4 py-3 last:border-0 hover:bg-neutral-50 ${!n.leida ? "bg-emerald-50/40" : ""}`}
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${!n.leida ? "bg-amber-600" : "bg-transparent"}`} />
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm ${!n.leida ? "font-semibold text-neutral-800" : "text-neutral-600"}`}>{n.titulo}</div>
                      {n.mensaje && <div className="mt-0.5 text-xs text-neutral-500">{n.mensaje}</div>}
                      <div className="mt-1 text-[11px] text-neutral-400">{haceTiempo(n.created_at)}</div>
                    </div>
                  </div>
                );
                return n.enlace ? (
                  <Link
                    key={n.id}
                    href={n.enlace}
                    onClick={() => {
                      marcarLeida(n);
                      setAbierto(false);
                    }}
                  >
                    {contenido}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => marcarLeida(n)} className="block w-full text-left">
                    {contenido}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

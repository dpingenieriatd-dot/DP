"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { descartarRecordatorio, posponerRecordatorio } from "@/app/(app)/seguimiento/agendas/actions";
import { reproducirTimbreRecordatorio, desbloquearAudio } from "@/lib/chime";

type Bloque = {
  id: string;
  dia: string;
  hora_inicio: string;
  horas: number;
  tarea: string | null;
  recordatorio_snooze_hasta: string | null;
  clientes: { nombre: string } | null;
  proyectos: { nombre: string } | null;
};

function hoyLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** dia/hora_inicio son hora de pared (sin zona) — igual que el reloj local de cada usuario, no hace falta convertir. */
function inicioBloque(b: Pick<Bloque, "dia" | "hora_inicio">) {
  const [y, m, d] = b.dia.split("-").map(Number);
  const [hh, mm] = b.hora_inicio.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

const VENTANA_GRACIA_MIN = 30;
const INTERVALO_CHEQUEO_MS = 20_000;

export function AgendaReminderPopup() {
  const [activo, setActivo] = useState<Bloque | null>(null);
  const colaRef = useRef<Bloque[]>([]);
  const activoRef = useRef<Bloque | null>(null);
  const sonadosRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef({ minutos: 15, sonido: true });

  const mostrarSiguiente = useCallback(() => {
    const siguiente = colaRef.current.shift() ?? null;
    activoRef.current = siguiente;
    setActivo(siguiente);
    if (siguiente && prefsRef.current.sonido && !sonadosRef.current.has(siguiente.id)) {
      sonadosRef.current.add(siguiente.id);
      reproducirTimbreRecordatorio();
    }
  }, []);

  const chequear = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await supabase
      .from("profiles")
      .select("recordatorio_minutos_antes, recordatorio_sonido")
      .eq("id", user.id)
      .single();
    if (perfil) {
      prefsRef.current = {
        minutos: perfil.recordatorio_minutos_antes ?? 15,
        sonido: perfil.recordatorio_sonido ?? true,
      };
    }

    const { data: bloques } = await supabase
      .from("agenda_bloques")
      .select("id, dia, hora_inicio, horas, tarea, recordatorio_snooze_hasta, clientes(nombre), proyectos(nombre)")
      .eq("usuario_id", user.id)
      .eq("dia", hoyLocalISO())
      .eq("recordatorio_estado", "pendiente");

    const ahora = Date.now();
    const debidos = ((bloques ?? []) as unknown as Bloque[]).filter((b) => {
      const inicio = inicioBloque(b).getTime();
      const disparo = inicio - prefsRef.current.minutos * 60_000;
      if (ahora < disparo) return false;
      if (ahora > inicio + VENTANA_GRACIA_MIN * 60_000) return false;
      if (b.recordatorio_snooze_hasta && new Date(b.recordatorio_snooze_hasta).getTime() > ahora) return false;
      return true;
    });

    const idsEnCola = new Set(colaRef.current.map((b) => b.id));
    const idActivo = activoRef.current?.id;
    const candidatos = debidos.filter((b) => b.id !== idActivo && !idsEnCola.has(b.id));
    if (!candidatos.length) return;

    // "Reclamar" cada bloque con un UPDATE condicional (pendiente -> mostrado):
    // si dos chequeos casi simultáneos (pestañas distintas, o el doble efecto
    // de Strict Mode en desarrollo) detectan el mismo bloque, solo uno logra
    // cambiar la fila — evita notificaciones/popups duplicados.
    const resultados = await Promise.all(
      candidatos.map(async (b) => {
        const { data } = await supabase
          .from("agenda_bloques")
          .update({ recordatorio_estado: "mostrado" })
          .eq("id", b.id)
          .eq("recordatorio_estado", "pendiente")
          .select("id");
        return data && data.length > 0 ? b : null;
      }),
    );
    const nuevos = resultados.filter((b): b is Bloque => b !== null);
    if (!nuevos.length) return;

    colaRef.current = [...colaRef.current, ...nuevos];
    if (!activoRef.current) mostrarSiguiente();

    // También queda registrado en la campana, no solo como popup.
    await supabase.from("notificaciones").insert(
      nuevos.map((b) => ({
        usuario_id: user.id,
        tipo: "agenda_recordatorio",
        titulo: b.tarea || "Bloque de agenda",
        mensaje: `${b.hora_inicio.slice(0, 5)} · ${[b.clientes?.nombre, b.proyectos?.nombre].filter(Boolean).join(" · ") || "Sin cliente/proyecto"}`,
        enlace: "/seguimiento/agendas",
      })),
    );
  }, [mostrarSiguiente]);

  useEffect(() => {
    chequear();
    const id = setInterval(chequear, INTERVALO_CHEQUEO_MS);
    const desbloq = () => desbloquearAudio();
    window.addEventListener("click", desbloq, { once: true });
    window.addEventListener("keydown", desbloq, { once: true });
    return () => {
      clearInterval(id);
      window.removeEventListener("click", desbloq);
      window.removeEventListener("keydown", desbloq);
    };
  }, [chequear]);

  async function onOk() {
    if (!activo) return;
    const id = activo.id;
    setActivo(null);
    activoRef.current = null;
    await descartarRecordatorio(id);
    setTimeout(mostrarSiguiente, 300);
  }

  async function onSnooze(minutos: number) {
    if (!activo) return;
    const id = activo.id;
    setActivo(null);
    activoRef.current = null;
    await posponerRecordatorio(id, minutos);
    setTimeout(mostrarSiguiente, 300);
  }

  if (!activo) return null;

  const inicio = inicioBloque(activo);
  const faltan = Math.round((inicio.getTime() - Date.now()) / 60000);
  const cuando = faltan > 1 ? `En ${faltan} minutos` : faltan === 1 ? "En 1 minuto" : faltan === 0 ? "Ahora" : "Ya empezó";

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-[100] w-[92vw] max-w-[360px] animate-[recordatorio-in_0.35s_cubic-bezier(0.16,1,0.3,1)] rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-white">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-900 opacity-20" />
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="relative">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
            {cuando} · {activo.hora_inicio.slice(0, 5)}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-emerald-900">{activo.tarea || "Bloque de agenda"}</div>
          {(activo.clientes?.nombre || activo.proyectos?.nombre) && (
            <div className="mt-0.5 truncate text-xs text-neutral-500">
              {[activo.clientes?.nombre, activo.proyectos?.nombre].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => onSnooze(5)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Posponer 5 min
        </button>
        <button onClick={onOk} className="rounded-md bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
          Entendido
        </button>
      </div>
    </div>
  );
}

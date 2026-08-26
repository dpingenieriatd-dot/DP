"use client";

import { useEffect, useState } from "react";

/** Reloj en vivo HH:MM:SS desde un timestamp de inicio, actualizado cada segundo. */
export function useElapsed(inicio: string | null) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!inicio) return;
    const start = new Date(inicio).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setElapsed(`${h}:${m}:${sec}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inicio]);
  return elapsed;
}

/** Reloj en vivo del tiempo TOTAL de una tarea: lo ya consolidado (horasBase) + la sesión que
 * está corriendo ahora mismo (si la hay) — para mostrar el cronómetro en cualquier tarjeta "En
 * proceso", sin importar quién la esté viendo (igual que el HTML de referencia). */
export function useTiempoTotal(horasBase: number, inicioSesion: string | null) {
  const [elapsed, setElapsed] = useState(() => formatHoras(horasBase));
  useEffect(() => {
    if (!inicioSesion) return;
    const start = new Date(inicioSesion).getTime();
    const tick = () => {
      const sesionSeg = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsed(formatHoras(horasBase + sesionSeg / 3600));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [horasBase, inicioSesion]);
  return elapsed;
}

/** Formatea horas decimales (ej. 1.5) como "1h 30m", para tiempo consolidado. */
export function formatHoras(horas: number) {
  const totalMin = Math.round(horas * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

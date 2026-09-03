"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Muestra una confirmación efímera ("Cambios guardados") después de un guardado
 * exitoso. Los formularios de detalle de Gestión no daban ninguna señal al
 * guardar — solo mostraban el error si fallaba.
 */
export function useGuardado(ms = 3000) {
  const [guardado, setGuardado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marcarGuardado = useCallback(() => {
    setGuardado(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setGuardado(false), ms);
  }, [ms]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { guardado, marcarGuardado };
}

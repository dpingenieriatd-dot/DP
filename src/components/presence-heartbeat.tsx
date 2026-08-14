"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const INTERVALO_MS = 45_000;

/**
 * Manda un "latido" mientras la pestaña está visible, para que la página
 * de Usuarios (admin) pueda mostrar quién está "En línea" ahora mismo.
 * No manda nada con la pestaña en segundo plano, para que "en línea"
 * refleje uso real, no solo una pestaña abierta y olvidada.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();

    async function latido() {
      if (document.visibilityState !== "visible") return;
      // Espera a que el cliente resuelva la sesión antes de llamar la RPC:
      // justo después del login, el cliente del navegador puede tardar un
      // instante en tener el JWT listo, y sin esto la primera llamada se
      // pierde en silencio (auth.uid() nulo del lado de Postgres, sin error).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.rpc("actualizar_last_seen");
    }

    latido();
    const id = setInterval(latido, INTERVALO_MS);
    document.addEventListener("visibilitychange", latido);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", latido);
    };
  }, []);

  return null;
}

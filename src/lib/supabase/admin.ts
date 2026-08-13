import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la service_role key — puentea RLS, úsalo SOLO en Server
 * Actions/Route Handlers, nunca en código que corra en el navegador.
 * La key vive en SUPABASE_SERVICE_ROLE_KEY (sin prefijo NEXT_PUBLIC_,
 * para que no se filtre al bundle del cliente). Se consigue en Supabase →
 * Settings → API → service_role key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor (Settings → API → service_role key en Supabase). No es lo mismo que la anon key.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

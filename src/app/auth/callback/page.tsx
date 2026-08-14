import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CallbackHashHandler } from "./hash-handler";

/**
 * Supabase puede volver aquí de dos formas distintas según el flujo del
 * enlace que se generó (depende de cómo se pidió el enlace, no es algo
 * que la app controle directamente):
 *  - `?code=...` (PKCE): se puede intercambiar por una sesión del lado del
 *    servidor — esto es lo que produce un signInWithOAuth/resetPasswordForEmail
 *    llamado desde el navegador con el cliente SSR de este proyecto.
 *  - `#access_token=...&refresh_token=...` (flujo implícito, ej. enlaces
 *    generados directo con la API de admin de Supabase): el fragmento NUNCA
 *    llega al servidor, así que se resuelve del lado del cliente en
 *    CallbackHashHandler.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string; next?: string }> }) {
  const { code, next } = await searchParams;
  const destino = next ?? "/cuenta/password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(destino);
    redirect("/login?error=enlace_invalido");
  }

  return <CallbackHashHandler next={destino} />;
}

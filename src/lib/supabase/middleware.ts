import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas
 * que no sean /login. Ajustar la lista de rutas públicas cuando exista
 * el modelo de roles/módulos definitivo (pendiente de la Solicitud de Información).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Todavía no existe el proyecto de Supabase: dejamos pasar sin exigir
    // sesión para poder navegar el esqueleto. Quitar esta salida temprana
    // en cuanto .env.local tenga las llaves reales.
    console.warn(
      "[proxy] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY no configuradas: la plataforma corre sin autenticación real.",
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/recuperar-password") ||
    request.nextUrl.pathname.startsWith("/auth/callback") ||
    // Llamadas servidor-a-servidor (Vercel Cron): no hay sesión de navegador,
    // se autentican con su propio secreto (ver CRON_SECRET) dentro de la ruta.
    request.nextUrl.pathname.startsWith("/api/cron/");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CallbackHashHandler({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");

    if (!access_token || !refresh_token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- enlace sin tokens válidos, detectado leyendo window.location (no hay forma de saberlo antes del mount)
      setError(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setError(true);
      else router.replace(next);
    });
  }, [next, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-neutral-600">El enlace no es válido o ya expiró.</p>
          <a href="/login" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
            Volver a iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <p className="text-sm text-neutral-500">Verificando enlace…</p>
    </div>
  );
}

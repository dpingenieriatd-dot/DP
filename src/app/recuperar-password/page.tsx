"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/cuenta/password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <Image src="/logo-dp.png" alt="D&P Ingeniería Integral" width={327} height={233} className="mx-auto h-auto w-40" priority />
        <h1 className="mt-4 text-center text-lg font-semibold text-emerald-900">Recuperar contraseña</h1>

        {enviado ? (
          <p className="mt-4 text-center text-sm text-neutral-600">
            Si el correo <strong>{email}</strong> existe en la plataforma, te enviamos un enlace para crear una
            contraseña nueva. Revisá tu bandeja de entrada (y spam).
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mt-2 text-center text-sm text-neutral-500">
              Ingresá tu correo y te enviamos un enlace para crear una contraseña nueva.
            </p>
            <label className="mt-6 block text-sm font-medium text-neutral-700">
              Correo
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </label>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-md bg-emerald-900 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? "Enviando…" : "Enviar enlace"}
            </button>
          </form>
        )}

        <Link href="/login" className="mt-4 block text-center text-xs text-neutral-500 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

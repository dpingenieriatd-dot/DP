"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setOk(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-emerald-900">Cambiar contraseña</h1>

        {ok ? (
          <div className="mt-4">
            <p className="text-sm text-neutral-600">Tu contraseña se actualizó correctamente.</p>
            <button
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
              className="mt-6 w-full rounded-md bg-emerald-900 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Ir a la plataforma
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mt-6 block text-sm font-medium text-neutral-700">
              Contraseña nueva
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-neutral-700">
              Confirmar contraseña
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </label>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-md bg-emerald-900 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
            <Link href="/" className="mt-4 block text-center text-xs text-neutral-500 hover:underline">
              Cancelar
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

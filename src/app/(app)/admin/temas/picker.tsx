"use client";

import { useState, useTransition } from "react";
import { actualizarTema } from "./actions";

const TEMAS = [
  {
    id: "verde",
    nombre: "Verde D&P (actual)",
    descripcion: "Paleta de marca oficial — verde principal y oscuro, acentos ámbar.",
    swatches: [
      { hex: "#27500A", label: "Estructural (900)" },
      { hex: "#639922", label: "Acento (800)" },
      { hex: "#477915", label: "Texto/enlaces (700)" },
      { hex: "#F1EFE8", label: "Fondo" },
    ],
  },
  {
    id: "azul",
    nombre: "Psychology & Well-being",
    descripcion: "Navy Blue, Azure-Teal y Aqua-White — tonos azules para bienestar/psicología.",
    swatches: [
      { hex: "#002640", label: "Estructural (900)" },
      { hex: "#008F91", label: "Acento (800)" },
      { hex: "#00797A", label: "Texto/enlaces (700)" },
      { hex: "#F3FCFD", label: "Fondo" },
    ],
  },
];

export function TemaPicker({ temaActual }: { temaActual: string }) {
  const [seleccionado, setSeleccionado] = useState(temaActual);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function elegir(id: string) {
    setSeleccionado(id);
    setError(null);
    setOk(false);
    startTransition(async () => {
      const r = await actualizarTema(id);
      if (r?.error) setError(r.error);
      else setOk(true);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TEMAS.map((t) => {
          const activo = seleccionado === t.id;
          return (
            <button
              key={t.id}
              onClick={() => elegir(t.id)}
              disabled={pending}
              className={`rounded-lg border-2 p-4 text-left transition disabled:opacity-60 ${
                activo ? "border-emerald-700 bg-emerald-50" : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-emerald-900">{t.nombre}</span>
                {activo && (
                  <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Activo
                  </span>
                )}
              </div>
              <p className="mb-3 text-xs text-neutral-500">{t.descripcion}</p>
              <div className="flex gap-2">
                {t.swatches.map((s) => (
                  <div key={s.label} className="flex-1">
                    <div className="h-10 rounded-md border border-black/5" style={{ backgroundColor: s.hex }} />
                    <div className="mt-1 text-[10px] text-neutral-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {ok && !error && (
        <p className="mt-3 text-sm text-emerald-700">
          Tema guardado. Se aplica a toda la app en la próxima carga de página (recargá para verlo ya mismo).
        </p>
      )}
    </div>
  );
}

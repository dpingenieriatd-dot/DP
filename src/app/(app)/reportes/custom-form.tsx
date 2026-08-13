"use client";

import { useState } from "react";

const TIPOS = [
  { value: "compras", label: "Compras" },
  { value: "presupuestos", label: "Presupuestos" },
];

export function CustomReportForm({ proyectos }: { proyectos: { id: string; codigo: string | null; nombre: string }[] }) {
  const [tipo, setTipo] = useState("compras");
  const [proyectoId, setProyectoId] = useState("");

  const href = proyectoId ? `/api/reportes/${tipo}?proyecto_id=${proyectoId}` : undefined;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Tipo de reporte</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="in">
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Proyecto</span>
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="in">
            <option value="">Seleccione…</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo ? `${p.codigo} · ` : ""}
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <a
          href={href}
          aria-disabled={!href}
          onClick={(e) => {
            if (!href) e.preventDefault();
          }}
          className={`rounded-md px-4 py-2 text-center text-sm font-semibold text-white ${
            href ? "bg-emerald-900 hover:bg-emerald-800" : "cursor-not-allowed bg-neutral-300"
          }`}
        >
          Descargar PDF
        </a>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Genera el listado completo de {TIPOS.find((t) => t.value === tipo)?.label.toLowerCase()} de ese proyecto, con su
        total.
      </p>
    </div>
  );
}

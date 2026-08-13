"use client";

import { useState } from "react";

type FiltroKey = "proyecto" | "cliente" | "usuario" | "estado";

const FILTRO_LABELS: Record<FiltroKey, string> = {
  proyecto: "Proyecto",
  cliente: "Cliente",
  usuario: "Usuario",
  estado: "Estado",
};

const TIPOS: { value: string; label: string; filtros: FiltroKey[]; estados?: string[] }[] = [
  { value: "compras", label: "Compras", filtros: ["proyecto"] },
  { value: "presupuestos", label: "Presupuestos", filtros: ["proyecto"] },
  { value: "proyectos", label: "Proyectos", filtros: ["cliente", "estado"], estados: ["Planeado", "En ejecucion", "Finalizado", "Cancelado"] },
  { value: "cotizaciones", label: "Cotizaciones", filtros: ["cliente", "estado"], estados: ["Borrador", "Aprobada", "Rechazada"] },
  {
    value: "tareas",
    label: "Tareas",
    filtros: ["proyecto", "cliente", "usuario", "estado"],
    estados: ["Disponible", "En proceso", "Terminada"],
  },
  {
    value: "actividades",
    label: "Actividades",
    filtros: ["proyecto", "cliente", "usuario", "estado"],
    estados: ["Cumplido", "Parcial", "Pendiente", "No cumplido"],
  },
];

export function CustomReportForm({
  clientes,
  proyectos,
  usuarios,
}: {
  clientes: { id: string; nombre: string }[];
  proyectos: { id: string; codigo: string | null; nombre: string }[];
  usuarios: { id: string; full_name: string | null; email: string | null }[];
}) {
  const [tipoValue, setTipoValue] = useState("compras");
  const [proyectoId, setProyectoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [estado, setEstado] = useState("");

  const tipo = TIPOS.find((t) => t.value === tipoValue)!;

  function cambiarTipo(v: string) {
    setTipoValue(v);
    setProyectoId("");
    setClienteId("");
    setUsuarioId("");
    setEstado("");
  }

  const params = new URLSearchParams();
  if (tipo.filtros.includes("proyecto") && proyectoId) params.set("proyecto_id", proyectoId);
  if (tipo.filtros.includes("cliente") && clienteId) params.set("cliente_id", clienteId);
  if (tipo.filtros.includes("usuario") && usuarioId) params.set("usuario_id", usuarioId);
  if (tipo.filtros.includes("estado") && estado) params.set("estado", estado);

  const href = params.toString() ? `/api/reportes/${tipo.value}?${params.toString()}` : undefined;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">Tipo de reporte</span>
          <select value={tipoValue} onChange={(e) => cambiarTipo(e.target.value)} className="in">
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-neutral-400">
            Filtros: {tipo.filtros.map((f) => FILTRO_LABELS[f]).join(", ")}
          </span>
        </label>

        {tipo.filtros.includes("proyecto") && (
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Proyecto</span>
            <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="in">
              <option value="">Todos</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} · ` : ""}
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {tipo.filtros.includes("cliente") && (
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Cliente</span>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="in">
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        {tipo.filtros.includes("usuario") && (
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Usuario</span>
            <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} className="in">
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </label>
        )}

        {tipo.filtros.includes("estado") && (
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Estado</span>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="in">
              <option value="">Todos</option>
              {tipo.estados?.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        )}

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
        Elegí al menos un filtro para generar el PDF de {tipo.label.toLowerCase()} con ese recorte y sus totales.
      </p>
    </div>
  );
}

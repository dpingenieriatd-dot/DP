"use client";

import { useRef, useState, useTransition } from "react";
import { crearTicket, actualizarTicket } from "./actions";

export type Ticket = {
  id: string;
  titulo: string;
  descripcion: string;
  urgencia: "Baja" | "Media" | "Alta";
  estado: "Abierto" | "En revisión" | "Resuelto";
  pagina: string | null;
  respuesta: string | null;
  creado_en: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

const URGENCIA_BADGE: Record<string, string> = {
  Baja: "bg-neutral-100 text-neutral-600",
  Media: "bg-amber-100 text-amber-800",
  Alta: "bg-red-100 text-red-700",
};

const ESTADO_BADGE: Record<string, string> = {
  Abierto: "bg-red-100 text-red-700",
  "En revisión": "bg-amber-100 text-amber-800",
  Resuelto: "bg-emerald-100 text-emerald-700",
};

export function SoporteForm({ tickets }: { tickets: Ticket[] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function crear(fd: FormData) {
    startTransition(async () => {
      const r = await crearTicket(fd);
      if (r?.error) {
        setMsg(r.error);
      } else {
        setMsg("Ticket reportado. Se avisó por correo.");
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Soporte técnico</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Reporta problemas o solicitudes de mejora sobre la plataforma. Al crear un ticket se notifica por correo automáticamente.
      </p>

      <form ref={formRef} action={crear} className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-emerald-900">Reportar un problema</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <Campo label="Título">
            <input name="titulo" required placeholder="Ej. El PDF de cotización no carga el logo" className="in" />
          </Campo>
          <Campo label="Urgencia">
            <select name="urgencia" defaultValue="Media" className="in">
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </Campo>
        </div>
        <Campo label="Descripción">
          <textarea name="descripcion" required rows={4} placeholder="Qué pasó, en qué pantalla, qué esperabas que pasara..." className="in" />
        </Campo>
        <Campo label="Página o sección (opcional)">
          <input name="pagina" placeholder="Ej. Gestión > Cotizaciones > Nueva" className="in" />
        </Campo>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50">
            {pending ? "Enviando..." : "Reportar problema"}
          </button>
          {msg && <span className="text-sm text-emerald-700">{msg}</span>}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        <h2 className="font-semibold text-emerald-900">Tickets ({tickets.length})</h2>
        {tickets.length === 0 && <p className="text-sm text-neutral-400">Sin tickets reportados todavía.</p>}
        {tickets.map((t) => (
          <TicketCard key={t.id} ticket={t} />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function guardar(fd: FormData) {
    startTransition(async () => {
      const r = await actualizarTicket(ticket.id, fd);
      setMsg(r?.error || "Guardado.");
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${URGENCIA_BADGE[ticket.urgencia]}`}>{ticket.urgencia}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_BADGE[ticket.estado]}`}>{ticket.estado}</span>
            <span className="font-medium text-emerald-900">{ticket.titulo}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{ticket.descripcion}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {ticket.profiles?.full_name || ticket.profiles?.email || "—"} · {new Date(ticket.creado_en).toLocaleString("es-CO")}
            {ticket.pagina ? ` · ${ticket.pagina}` : ""}
          </p>
        </div>
      </div>

      <form action={guardar} className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
        <Campo label="Estado" className="w-40">
          <select name="estado" defaultValue={ticket.estado} className="in">
            <option value="Abierto">Abierto</option>
            <option value="En revisión">En revisión</option>
            <option value="Resuelto">Resuelto</option>
          </select>
        </Campo>
        <Campo label="Respuesta / nota" className="flex-1">
          <input name="respuesta" defaultValue={ticket.respuesta ?? ""} placeholder="Qué se hizo o va a hacer al respecto" className="in" />
        </Campo>
        <button type="submit" disabled={pending} className="h-[38px] rounded-md bg-emerald-800 px-3 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50">
          {pending ? "..." : "Guardar"}
        </button>
        {msg && <span className="text-xs text-emerald-700">{msg}</span>}
      </form>
    </div>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

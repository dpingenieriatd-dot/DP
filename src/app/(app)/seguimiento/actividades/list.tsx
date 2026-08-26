"use client";

import { useState, useTransition } from "react";
import { createActividad, updateActividad, deleteActividad } from "./actions";
import { AgregarActividadCatalogo } from "@/components/agregar-actividad-catalogo";

type Actividad = {
  id: string;
  fecha: string;
  hora: string | null;
  cargo: string | null;
  actividad: string;
  cliente_id: string | null;
  proyecto_id: string | null;
  empresa_atendida_id: string | null;
  catalogo_actividad_id: string | null;
  estado: string;
  origen: string;
  observaciones: string | null;
  respuesta: string | null;
};

type ActividadCatalogo = { id: string; codigo: string; subproceso: string; descripcion: string | null; responsable_sugerido: string | null };
type Proceso = { codigo: string; nombre: string };

const COLUMNAS_FILTRO = ["Cargo", "Actividad", "Cliente", "Proyecto", "Empresa atendida", "Estado", "Origen"];

export function ActividadesList({
  rows,
  clientes,
  proyectos,
  empresas,
  actividadesCatalogo,
  procesos,
}: {
  rows: Actividad[];
  clientes: { id: string; nombre: string }[];
  proyectos: { id: string; codigo: string | null; nombre: string }[];
  empresas: { id: string; nombre: string }[];
  actividadesCatalogo: ActividadCatalogo[];
  procesos: Proceso[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [columnaFiltro, setColumnaFiltro] = useState("");
  const [valorFiltro, setValorFiltro] = useState("");

  const clienteNombre = (id: string | null) => clientes.find((c) => c.id === id)?.nombre ?? "—";
  const proyectoNombre = (id: string | null) => {
    const p = proyectos.find((p) => p.id === id);
    return p ? (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre) : "—";
  };
  const empresaNombre = (id: string | null) => empresas.find((e) => e.id === id)?.nombre ?? "—";

  function valorColumna(r: Actividad, columna: string) {
    switch (columna) {
      case "Cargo":
        return r.cargo ?? "—";
      case "Actividad":
        return r.actividad;
      case "Cliente":
        return clienteNombre(r.cliente_id);
      case "Proyecto":
        return proyectoNombre(r.proyecto_id);
      case "Empresa atendida":
        return empresaNombre(r.empresa_atendida_id);
      case "Estado":
        return r.estado;
      case "Origen":
        return r.origen;
      default:
        return "";
    }
  }

  const visibles = rows
    .filter((r) => !columnaFiltro || !valorFiltro || valorColumna(r, columnaFiltro).toLowerCase().includes(valorFiltro.toLowerCase()))
    .filter(
      (r) =>
        !busqueda ||
        `${r.cargo ?? ""} ${r.actividad} ${clienteNombre(r.cliente_id)} ${proyectoNombre(r.proyecto_id)} ${empresaNombre(r.empresa_atendida_id)}`
          .toLowerCase()
          .includes(busqueda.toLowerCase())
    );

  function abrirCrear() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }

  function abrirEditar(r: Actividad) {
    setEditing(r);
    setError(null);
    setOpen(true);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = editing ? await updateActividad(editing.id, formData) : await createActividad(formData);
      if (r?.error) setError(r.error);
      else {
        setOpen(false);
        setEditing(null);
      }
    });
  }

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">Actividades</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{rows.length}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">Registro histórico de actividades del equipo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar actividad..."
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button onClick={abrirCrear} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            + Nuevo
          </button>
          <button type="button" disabled title="Próximamente" className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-400">
            Columnas / vistas
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={columnaFiltro} onChange={(e) => setColumnaFiltro(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">Todas las columnas</option>
          {COLUMNAS_FILTRO.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={valorFiltro}
          onChange={(e) => setValorFiltro(e.target.value)}
          placeholder="Valor a buscar"
          className="min-w-[200px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setColumnaFiltro("");
            setValorFiltro("");
            setBusqueda("");
          }}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          Limpiar filtro
        </button>
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Fecha</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cargo</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Actividad</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cliente</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Empresa atendida</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Proyecto</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Estado</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Origen</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Observaciones</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">{r.fecha}</td>
                <td className="px-3 py-2">{r.cargo ?? "—"}</td>
                <td className="px-3 py-2">{r.actividad}</td>
                <td className="px-3 py-2">{clienteNombre(r.cliente_id)}</td>
                <td className="px-3 py-2">{empresaNombre(r.empresa_atendida_id)}</td>
                <td className="px-3 py-2">{proyectoNombre(r.proyecto_id)}</td>
                <td className="px-3 py-2">{r.estado}</td>
                <td className="px-3 py-2 text-neutral-500">{r.origen}</td>
                <td className="px-3 py-2 text-neutral-500">{r.observaciones ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button onClick={() => abrirEditar(r)} className="mr-2 text-xs font-medium text-emerald-700 hover:underline">
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await deleteActividad(r.id);
                      })
                    }
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-neutral-400">
                  {rows.length === 0 ? "Sin actividades registradas todavía." : "Ningún registro coincide con los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <ActividadModal
          editing={editing}
          clientes={clientes}
          proyectos={proyectos}
          empresas={empresas}
          actividadesCatalogo={actividadesCatalogo}
          procesos={procesos}
          error={error}
          pending={pending}
          onClose={() => setOpen(false)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function ActividadModal({
  editing,
  clientes,
  proyectos,
  empresas,
  actividadesCatalogo,
  procesos,
  error,
  pending,
  onClose,
  onSubmit,
}: {
  editing: Actividad | null;
  clientes: { id: string; nombre: string }[];
  proyectos: { id: string; codigo: string | null; nombre: string }[];
  empresas: { id: string; nombre: string }[];
  actividadesCatalogo: ActividadCatalogo[];
  procesos: Proceso[];
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
}) {
  const [catalogoLocal, setCatalogoLocal] = useState(actividadesCatalogo);
  const [catalogoId, setCatalogoId] = useState(editing?.catalogo_actividad_id ?? "");
  const [cargo, setCargo] = useState(editing?.cargo ?? "");
  const [actividadTexto, setActividadTexto] = useState(editing?.actividad ?? "");
  const actividadCat = catalogoLocal.find((a) => a.id === catalogoId);

  function elegirActividad(id: string) {
    setCatalogoId(id);
    const a = catalogoLocal.find((x) => x.id === id);
    if (a) {
      setActividadTexto(`${a.codigo}_${a.subproceso}`);
      if (a.responsable_sugerido) setCargo(a.responsable_sugerido);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form action={onSubmit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-emerald-900">{editing ? "Editar" : "Nuevo"} — Actividades</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Fecha</span>
              <input type="date" name="fecha" required defaultValue={editing?.fecha ?? new Date().toISOString().slice(0, 10)} className="in" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Hora de inicio (crea el bloque en Agenda)</span>
              <input type="time" name="hora" defaultValue={editing?.hora ?? ""} className="in" />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Actividad del mapa de procesos</span>
            <select
              name="catalogo_actividad_id"
              value={catalogoId}
              onChange={(e) => elegirActividad(e.target.value)}
              className="in"
            >
              <option value="">Seleccionar actividad...</option>
              {catalogoLocal.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo} · {a.subproceso}
                </option>
              ))}
            </select>
            {actividadCat && (
              <span className="mt-1 block text-xs text-neutral-500">
                {actividadCat.descripcion || "Sin descripción"}
                {actividadCat.responsable_sugerido ? ` · Responsable sugerido: ${actividadCat.responsable_sugerido}` : ""}
              </span>
            )}
            <AgregarActividadCatalogo
              procesos={procesos}
              onAdded={(nueva) => {
                setCatalogoLocal((prev) => [...prev, nueva]);
                elegirActividad(nueva.id);
              }}
            />
          </label>
          <input type="hidden" name="proceso_codigo" value={actividadCat?.codigo ?? ""} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Cargo</span>
              <input name="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} className="in" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Actividad</span>
              <input name="actividad" required value={actividadTexto} onChange={(e) => setActividadTexto(e.target.value)} className="in" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Cliente</span>
              <select name="cliente_id" defaultValue={editing?.cliente_id ?? ""} className="in">
                <option value="">Seleccione…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Empresa atendida</span>
              <select name="empresa_atendida_id" defaultValue={editing?.empresa_atendida_id ?? ""} className="in">
                <option value="">Cliente directo / Sin empresa atendida</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Proyecto</span>
              <select name="proyecto_id" defaultValue={editing?.proyecto_id ?? ""} className="in">
                <option value="">Seleccione…</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo ? `${p.codigo} · ` : ""}
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-neutral-600">Estado</span>
              <select name="estado" defaultValue={editing?.estado ?? "Pendiente"} className="in">
                <option>Cumplido</option>
                <option>Parcial</option>
                <option>Pendiente</option>
                <option>No cumplido</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Observaciones</span>
            <textarea name="observaciones" defaultValue={editing?.observaciones ?? ""} className="in" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">Respuesta</span>
            <textarea name="respuesta" defaultValue={editing?.respuesta ?? ""} className="in" />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

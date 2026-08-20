"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "email" | "date" | "time";
  options?: string[];
  /** Para selects relacionales (value = id real, label = lo que se ve). Tiene prioridad sobre `options`. */
  optionEntries?: { value: string; label: string }[];
  required?: boolean;
  /** Columna calculada que solo se muestra en la tabla, sin campo propio en el formulario de crear/editar. */
  tableOnly?: boolean;
  /** Si se define, la celda de esta columna se muestra como enlace hacia la URL guardada en row[linkKey] (o texto plano si esa fila no la tiene). La URL se precalcula del lado del servidor porque este es un Client Component y no puede recibir funciones desde el Server Component que lo llama. */
  linkKey?: string;
};

/** Muestra el label de optionEntries en vez del id crudo de una FK (no puede ser una función: este componente es client y las props vienen de un Server Component). */
function displayValue(f: Field, value: Row[string]) {
  if (f.optionEntries) return f.optionEntries.find((o) => o.value === String(value))?.label ?? "—";
  return String(value ?? "—");
}

export type Row = Record<string, string | number | boolean | null>;

export function CrudTable({
  title,
  subtitle,
  fields,
  rows,
  idKey = "id",
  onCreate,
  onUpdate,
  onDelete,
  emptyLabel = "Sin registros todavía.",
  banner,
  newLabel,
  initialFiltro,
  presetNuevo,
  rowActionsById,
}: {
  title: string;
  subtitle?: string;
  fields: Field[];
  rows: Row[];
  idKey?: string;
  onCreate: (formData: FormData) => Promise<{ error?: string } | void>;
  onUpdate: (id: string, formData: FormData) => Promise<{ error?: string } | void>;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
  emptyLabel?: string;
  banner?: React.ReactNode;
  newLabel?: string;
  /** Pre-filtra la tabla al montar (p. ej. al llegar desde el enlace "Ver empresas" de otro catálogo). */
  initialFiltro?: { columna: string; valor: string };
  /** Si se define, abre el modal de creación al montar con estos valores precargados (p. ej. cliente_id ya seleccionado). */
  presetNuevo?: Record<string, string>;
  /** Acciones extra por fila, junto a Editar/Eliminar (p. ej. un enlace de navegación cruzada a otro catálogo), indexadas por idKey — se pasan ya renderizadas porque este es un Client Component y no puede recibir funciones desde el Server Component que lo llama. */
  rowActionsById?: Record<string, React.ReactNode>;
}) {
  const [open, setOpen] = useState(Boolean(presetNuevo));
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [columnaFiltro, setColumnaFiltro] = useState(initialFiltro?.columna ?? "");
  const [valorFiltro, setValorFiltro] = useState(initialFiltro?.valor ?? "");

  const visibles = rows.filter((row) => {
    if (busqueda) {
      const texto = fields.map((f) => displayValue(f, row[f.key])).join(" ").toLowerCase();
      if (!texto.includes(busqueda.toLowerCase())) return false;
    }
    if (columnaFiltro && valorFiltro) {
      const f = fields.find((f) => f.key === columnaFiltro);
      if (!f) return true;
      if (!displayValue(f, row[f.key]).toLowerCase().includes(valorFiltro.toLowerCase())) return false;
    }
    return true;
  });

  function openCreate() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setError(null);
    setOpen(true);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await onUpdate(String(editing[idKey]), formData)
        : await onCreate(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setEditing(null);
    });
  }

  function handleDelete(row: Row) {
    const id = String(row[idKey]);
    startTransition(async () => {
      await onDelete(id);
      setConfirmingId(null);
    });
  }

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-emerald-900">{title}</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{rows.length}</span>
          </div>
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar ${title.toLowerCase()}...`}
            className="w-56 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={openCreate}
            className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            + {newLabel ?? `Nuevo`}
          </button>
          <button
            type="button"
            disabled
            title="Próximamente"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-400"
          >
            Columnas / vistas
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={columnaFiltro}
          onChange={(e) => setColumnaFiltro(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Todas las columnas</option>
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
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

      {banner && <div className="mb-3">{banner}</div>}

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-max text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
              {fields.map((f) => (
                <th key={f.key} className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">
                  {f.label}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="px-3 py-8 text-center text-neutral-400">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {visibles.map((row) => (
              <tr key={String(row[idKey])} className="border-t border-neutral-100 hover:bg-neutral-50">
                {fields.map((f) => {
                  const href = f.linkKey ? (row[f.linkKey] as string | null | undefined) : null;
                  return (
                    <td key={f.key} className="px-3 py-2">
                      {href ? (
                        <Link href={href} className="font-medium text-emerald-700 hover:underline">
                          {displayValue(f, row[f.key])}
                        </Link>
                      ) : (
                        displayValue(f, row[f.key])
                      )}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {confirmingId === String(row[idKey]) ? (
                    <span className="inline-flex items-center gap-2 text-xs">
                      <span className="text-neutral-500">¿Eliminar?</span>
                      <button
                        onClick={() => handleDelete(row)}
                        disabled={pending}
                        className="font-semibold text-red-600 hover:underline disabled:opacity-60"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        className="text-neutral-500 hover:underline"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <>
                      {rowActionsById?.[String(row[idKey])]}
                      <button
                        onClick={() => openEdit(row)}
                        className="mr-2 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmingId(String(row[idKey]))}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            action={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 className="mb-4 text-lg font-semibold text-emerald-900">
              {editing ? "Editar" : "Nuevo"} — {title}
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.filter((f) => !f.tableOnly).map((f) => (
                <label
                  key={f.key}
                  className={`block text-sm ${f.type === "textarea" ? "sm:col-span-2" : ""}`}
                >
                  <span className="mb-1 block text-neutral-600">{f.label}</span>
                  {f.type === "textarea" ? (
                    <textarea
                      name={f.key}
                      defaultValue={editing ? String(editing[f.key] ?? "") : ""}
                      required={f.required}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  ) : f.type === "select" ? (
                    <select
                      name={f.key}
                      defaultValue={editing ? String(editing[f.key] ?? "") : (presetNuevo?.[f.key] ?? (f.optionEntries ? "" : f.options?.[0]))}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    >
                      {f.optionEntries ? (
                        <>
                          <option value="">Seleccione…</option>
                          {f.optionEntries.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </>
                      ) : (
                        f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <input
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "email"
                            ? "email"
                            : f.type === "date"
                              ? "date"
                              : f.type === "time"
                                ? "time"
                                : "text"
                      }
                      name={f.key}
                      step={f.type === "number" ? "any" : undefined}
                      defaultValue={editing ? String(editing[f.key] ?? "") : (presetNuevo?.[f.key] ?? "")}
                      required={f.required}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  )}
                </label>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

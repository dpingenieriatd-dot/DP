"use client";

import { useState, useTransition } from "react";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "email";
  options?: string[];
  required?: boolean;
};

export type Row = Record<string, string | number | boolean | null>;

export function CrudTable({
  title,
  fields,
  rows,
  idKey = "id",
  onCreate,
  onUpdate,
  onDelete,
  emptyLabel = "Sin registros todavía.",
}: {
  title: string;
  fields: Field[];
  rows: Row[];
  idKey?: string;
  onCreate: (formData: FormData) => Promise<{ error?: string } | void>;
  onUpdate: (id: string, formData: FormData) => Promise<{ error?: string } | void>;
  onDelete: (id: string) => Promise<{ error?: string } | void>;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-emerald-900">{title}</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nuevo
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              {fields.map((f) => (
                <th key={f.key} className="px-4 py-3">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={fields.length + 1} className="px-4 py-8 text-center text-neutral-400">
                  {emptyLabel}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={String(row[idKey])} className="border-t border-neutral-100 hover:bg-neutral-50">
                {fields.map((f) => (
                  <td key={f.key} className="px-4 py-2.5">
                    {String(row[f.key] ?? "—")}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
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

            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <label
                  key={f.key}
                  className={`block text-sm ${f.type === "textarea" ? "col-span-2" : ""}`}
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
                      defaultValue={editing ? String(editing[f.key] ?? "") : f.options?.[0]}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    >
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"}
                      name={f.key}
                      step={f.type === "number" ? "any" : undefined}
                      defaultValue={editing ? String(editing[f.key] ?? "") : ""}
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

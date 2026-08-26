"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ListChecks, SlidersHorizontal, FileSignature, Paperclip, Plus, Trash2 } from "lucide-react";
import { crearCotizacion, actualizarCotizacion, type CotizacionPayload, type ItemPayload } from "./actions";
import { subirSoporte, eliminarSoporte } from "./soportes-actions";
import { calcularCotizacionItems, money } from "@/lib/finance";

type Cotizacion = {
  id: string;
  codigo: string | null;
  cliente_id: string | null;
  empresa_id: string | null;
  nombre: string;
  responsable_id: string | null;
  fecha: string | null;
  estado: string;
  personas: number | null;
  vigencia_dias: number | null;
  contacto: string | null;
  correo_contacto: string | null;
  telefono_contacto: string | null;
  seguimiento_interno: string | null;
  resp_iva: boolean | null;
  margen_pct: number | null;
  admin_pct: number | null;
  descripcion_cliente: string | null;
  forma_pago: string | null;
  condiciones_cliente: string | null;
};

type Soporte = { id: string; cotizacion_id: string; nombre_archivo: string; storage_path: string; url: string | null };

type ItemExistente = { id: string; tipo: "insumo" | "profesional" | "material"; descripcion: string; unidad: string; cantidad: number; costo_unitario: number; precio_cliente_override: number | null };

export type Insumo = { id: string; codigo: string | null; descripcion: string; unidad: string | null; costo: number };
export type Profesional = { id: string; codigo: string | null; nombre: string; perfil: string | null; tarifa_hora: number | null };
export type Material = { id: string; codigo: string | null; nombre: string; valor_reposicion: number; vida_util_jornadas: number };

type ItemLocal = ItemPayload & { key: string };

const ESTADOS = ["Borrador", "Pendiente por definir", "Enviada", "Aprobada", "Rechazada"];

function nuevoKey() {
  return Math.random().toString(36).slice(2);
}

export function CotizacionForm({
  editing,
  clientes,
  empresas,
  profiles,
  soportes,
  insumos,
  profesionales,
  materiales,
  itemsIniciales,
}: {
  editing: Cotizacion | null;
  clientes: { id: string; nombre: string }[];
  empresas: { id: string; nombre: string; cliente_id: string | null }[];
  profiles: { id: string; full_name: string | null; email: string | null }[];
  soportes: Soporte[];
  insumos: Insumo[];
  profesionales: Profesional[];
  materiales: Material[];
  itemsIniciales: ItemExistente[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errorSoporte, setErrorSoporte] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [codigo, setCodigo] = useState(editing?.codigo ?? "");
  const [fecha, setFecha] = useState(editing?.fecha ?? new Date().toISOString().slice(0, 10));
  const [clienteId, setClienteId] = useState(editing?.cliente_id ?? "");
  const [empresaId, setEmpresaId] = useState(editing?.empresa_id ?? "");
  const [nombre, setNombre] = useState(editing?.nombre ?? "");
  const [responsableId, setResponsableId] = useState(editing?.responsable_id ?? "");
  const [personas, setPersonas] = useState(editing?.personas ?? 1);
  const [vigencia, setVigencia] = useState(editing?.vigencia_dias ?? 30);
  const [estado, setEstado] = useState(editing?.estado ?? "Pendiente por definir");
  const [contacto, setContacto] = useState(editing?.contacto ?? "");
  const [correo, setCorreo] = useState(editing?.correo_contacto ?? "");
  const [telefono, setTelefono] = useState(editing?.telefono_contacto ?? "");
  const [respIva, setRespIva] = useState(editing?.resp_iva ?? true);
  const [seguimiento, setSeguimiento] = useState(editing?.seguimiento_interno ?? "");
  const [descripcionCliente, setDescripcionCliente] = useState(editing?.descripcion_cliente ?? "");
  const [formaPago, setFormaPago] = useState(editing?.forma_pago ?? "");
  const [condicionesCliente, setCondicionesCliente] = useState(editing?.condiciones_cliente ?? "");
  const [adminPct, setAdminPct] = useState(editing?.admin_pct ?? 15);
  const [margenPct, setMargenPct] = useState(editing?.margen_pct ?? 30);

  const [items, setItems] = useState<ItemLocal[]>(
    itemsIniciales.map((i) => ({ key: nuevoKey(), tipo: i.tipo, descripcion: i.descripcion, unidad: i.unidad, cantidad: i.cantidad, costo_unitario: i.costo_unitario, precio_cliente_override: i.precio_cliente_override }))
  );
  const [modalTipo, setModalTipo] = useState<"insumo" | "profesional" | "material" | null>(null);

  const calc = useMemo(
    () => calcularCotizacionItems(items, { admin_pct: adminPct, margen_pct: margenPct, resp_iva: respIva, iva_pct: 19 }),
    [items, adminPct, margenPct, respIva]
  );

  const empresasDelCliente = empresas.filter((e) => !clienteId || e.cliente_id === clienteId || e.cliente_id === null);
  const clienteActual = clientes.find((c) => c.id === clienteId);

  function payload(): CotizacionPayload {
    return {
      codigo,
      cliente_id: clienteId,
      empresa_id: empresaId,
      nombre,
      responsable_id: responsableId || null,
      fecha,
      estado,
      personas: Number(personas) || 1,
      vigencia_dias: Number(vigencia) || 30,
      contacto,
      correo_contacto: correo,
      telefono_contacto: telefono,
      resp_iva: respIva,
      seguimiento_interno: seguimiento,
      admin_pct: Number(adminPct) || 0,
      margen_pct: Number(margenPct) || 0,
      descripcion_cliente: descripcionCliente,
      forma_pago: formaPago,
      condiciones_cliente: condicionesCliente,
      items: items.map(({ tipo, descripcion, unidad, cantidad, costo_unitario, precio_cliente_override }) => ({
        tipo,
        descripcion,
        unidad,
        cantidad,
        costo_unitario,
        precio_cliente_override,
      })),
    };
  }

  function guardar(estadoForzado: string | null) {
    if (!codigo.trim()) return setError("Ingresa manualmente el código / consecutivo de la cotización.");
    if (!nombre.trim()) return setError("Escribe el nombre de la cotización.");
    if (!clienteId || !empresaId) return setError("Selecciona cliente y empresa atendida.");
    if (!items.length) return setError("Agrega al menos un ítem a la cotización.");
    setError(null);
    const datos = payload();
    if (estadoForzado) datos.estado = estadoForzado;
    startTransition(async () => {
      const r = editing ? await actualizarCotizacion(editing.id, datos) : await crearCotizacion(datos);
      if (r?.error) setError(r.error);
      else if (!editing && "id" in (r ?? {})) router.push(`/gestion/cotizaciones/${(r as { id: string }).id}`);
      else router.push("/gestion/cotizaciones");
    });
  }

  function agregarItem(item: ItemPayload) {
    setItems((prev) => [...prev, { ...item, key: nuevoKey() }]);
    setModalTipo(null);
  }

  function quitarItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function actualizarItem(key: string, patch: Partial<ItemPayload>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-emerald-900">{editing ? "Editar cotización" : "Nueva cotización"}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Cotizaciones · <span className="font-medium text-neutral-700">{codigo || "Código pendiente"}</span> ·{" "}
            <span className="font-medium text-neutral-700">{editing?.estado ?? "Borrador"}</span>
          </p>
        </div>
        <Link href="/gestion/cotizaciones" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          ← Volver
        </Link>
      </div>

      <div className="max-w-4xl space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              <FileText size={15} /> Datos generales
            </h2>
            <span className="text-xs text-neutral-400">Código manual único · empresa atendida puede ser el mismo cliente</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Código / consecutivo de cotización" required>
              <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej. COT-015" className="in" />
              <p className="mt-1 text-xs text-neutral-400">El código debe ser nuevo y único. El sistema no permite repetir uno ya guardado.</p>
            </Campo>
            <Campo label="Fecha de elaboración">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="in" />
            </Campo>

            <Campo label="Cliente" required>
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  setEmpresaId("");
                }}
                className="in"
              >
                <option value="">Seleccione…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Empresa atendida" required>
              <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className="in">
                <option value="">Seleccione…</option>
                {clienteActual && <option value={`cliente:${clienteActual.id}`}>Mismo cliente — {clienteActual.nombre}</option>}
                {empresasDelCliente.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Nombre de la cotización" required>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la propuesta" className="in" />
            </Campo>
            <Campo label="Responsable comercial">
              <select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className="in">
                <option value="">Seleccione…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Número de personas">
              <input type="number" min={1} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="in" />
            </Campo>
            <Campo label="Vigencia de la oferta (días)">
              <input type="number" min={1} value={vigencia} onChange={(e) => setVigencia(Number(e.target.value))} className="in" />
            </Campo>

            <Campo label="Estado de la cotización">
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className="in">
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-400">Estados disponibles: pendiente por definir, enviada, aprobada o rechazada.</p>
            </Campo>
            <div className="flex items-end pb-1">
              <p className="text-xs text-neutral-400">El margen de utilidad se define directamente en el bloque de cálculo de la cotización.</p>
            </div>
          </div>

          <h3 className="mb-3 mt-5 text-sm font-semibold text-neutral-700">Contacto para seguimiento de la propuesta</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo label="Nombre del contacto">
              <input value={contacto} onChange={(e) => setContacto(e.target.value)} className="in" />
            </Campo>
            <Campo label="Correo">
              <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="in" />
            </Campo>
            <Campo label="Teléfono">
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="in" />
            </Campo>
            <Campo label="¿Responde por IVA?">
              <select value={respIva ? "true" : "false"} onChange={(e) => setRespIva(e.target.value === "true")} className="in">
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </Campo>
            <Campo label="Seguimiento interno / ¿Qué pasó con la propuesta?" full2>
              <textarea value={seguimiento} onChange={(e) => setSeguimiento(e.target.value)} className="in min-h-[70px]" />
              <p className="mt-1 text-xs text-neutral-400">Este texto es interno y no se imprime en la cotización del cliente.</p>
            </Campo>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              <ListChecks size={15} /> Ítems de la cotización
            </h2>
            <span className="text-xs text-neutral-400">El precio cliente unitario incluye administración + utilidad; el IVA se calcula al final</span>
          </div>

          <div className="overflow-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2 text-right">Cant.</th>
                  <th className="px-3 py-2 text-right">Costo unit. interno</th>
                  <th className="px-3 py-2 text-right">Precio cliente unit.</th>
                  <th className="px-3 py-2 text-right">Subtotal cliente</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {calc.itemsCalculados.map((i, idx) => {
                  const local = items[idx];
                  return (
                    <tr key={local.key} className="border-t border-neutral-100">
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-600">{local.tipo}</span>
                      </td>
                      <td className="px-3 py-2">{local.descripcion}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={local.cantidad}
                          onChange={(e) => actualizarItem(local.key, { cantidad: Number(e.target.value) || 0 })}
                          className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-right"
                        />{" "}
                        {local.unidad}
                      </td>
                      <td className="px-3 py-2 text-right">{money.format(local.costo_unitario)}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={Math.round(local.precio_cliente_override ?? i.autoUnitClient)}
                          title={`Automático: ${money.format(i.autoUnitClient)}`}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            actualizarItem(local.key, { precio_cliente_override: Number.isFinite(v) && v > 0 ? v : null });
                          }}
                          className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-right font-semibold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{money.format(i.subtotalCliente)}</td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => quitarItem(local.key)} title="Quitar" className="text-neutral-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                      Aún no hay ítems. Agrega insumos, profesionales o materiales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setModalTipo("insumo")} className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              <Plus size={13} /> Agregar insumo
            </button>
            <button type="button" onClick={() => setModalTipo("profesional")} className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              <Plus size={13} /> Agregar profesional
            </button>
            <button type="button" onClick={() => setModalTipo("material")} className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">
              <Plus size={13} /> Agregar material
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                <SlidersHorizontal size={15} /> Parámetros de esta cotización
              </h2>
              <p className="mt-1 text-xs text-neutral-500">Puedes modificar administración y utilidad según esta propuesta. Los cambios solo afectan esta cotización.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-neutral-500">
                Costos administrativos
                <div className="mt-1 flex items-center gap-1">
                  <input type="number" min={0} max={100} step={0.1} value={adminPct} onChange={(e) => setAdminPct(Number(e.target.value))} className="w-20 rounded-md border border-emerald-300 px-2 py-1.5 text-right text-sm font-semibold text-emerald-900" />
                  <span className="font-semibold">%</span>
                </div>
              </label>
              <label className="text-xs text-neutral-500">
                Margen de utilidad
                <div className="mt-1 flex items-center gap-1">
                  <input type="number" min={0} max={95} step={0.1} value={margenPct} onChange={(e) => setMargenPct(Number(e.target.value))} className="w-20 rounded-md border border-emerald-300 px-2 py-1.5 text-right text-sm font-semibold text-emerald-900" />
                  <span className="font-semibold">%</span>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-4 text-sm">
            <Linea label="Costos directos (interno)" valor={calc.direct} />
            <Linea label={`Costos administrativos (${adminPct}%)`} valor={calc.admin} />
            <Linea label={`Utilidad esperada (${margenPct}% del valor antes de IVA)`} valor={calc.utilidad} />
            <Linea label="Valor comercial antes de IVA" valor={calc.base} />
            <Linea label="IVA (19%)" valor={calc.clientIva} />
            <div className="flex items-center justify-between border-t border-emerald-200 pt-2 text-base font-bold text-emerald-900">
              <span>Total cotizado al cliente</span>
              <span>{money.format(calc.clientTotal)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-neutral-400">
            El PDF del cliente solo muestra descripción, cantidad, valor unitario comercial, subtotal, IVA y total. Nunca muestra costos internos, administración ni utilidad.
          </p>
        </div>

        {editing && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              <Paperclip size={15} /> Soportes que acompañan la cotización
            </h2>
            <p className="mb-3 text-xs text-neutral-500">Carga aquí los documentos que deben enviarse al cliente junto con la propuesta comercial.</p>
            <ul className="mb-3 space-y-1 text-sm">
              {soportes.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-1.5">
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                      {s.nombre_archivo}
                    </a>
                  ) : (
                    <span>{s.nombre_archivo}</span>
                  )}
                  <button
                    onClick={() => startTransition(async () => { await eliminarSoporte(s.id, s.storage_path); })}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
              {soportes.length === 0 && <li className="text-neutral-400">No hay soportes cargados para esta cotización.</li>}
            </ul>
            <form
              action={(fd) => {
                const cotId = editing.id;
                startTransition(async () => {
                  const r = await subirSoporte(cotId, fd);
                  if (r?.error) setErrorSoporte(r.error);
                  else setErrorSoporte(null);
                });
              }}
              className="flex items-center gap-2"
            >
              <input type="file" name="archivo" required className="text-sm" />
              <button type="submit" disabled={pending} className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 disabled:opacity-60">
                Seleccionar uno o varios soportes
              </button>
            </form>
            <p className="mt-2 text-xs text-neutral-400">Puedes cargar PDF, Word, Excel, PowerPoint, imágenes o ZIP. Los archivos quedan asociados únicamente a esta cotización.</p>
            {errorSoporte && <p className="mt-2 text-sm text-red-600">{errorSoporte}</p>}
          </div>
        )}

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            <FileSignature size={15} /> Información que aparecerá en la propuesta para el cliente
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <Campo label="Descripción / introducción comercial">
              <textarea value={descripcionCliente} onChange={(e) => setDescripcionCliente(e.target.value)} className="in min-h-[70px]" />
            </Campo>
            <Campo label="Forma de pago">
              <input value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="in" />
            </Campo>
            <Campo label="Condiciones comerciales adicionales">
              <textarea value={condicionesCliente} onChange={(e) => setCondicionesCliente(e.target.value)} className="in min-h-[70px]" />
            </Campo>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={pending} onClick={() => guardar("Borrador")} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60">
            Guardar borrador
          </button>
          <button type="button" disabled={pending} onClick={() => guardar(null)} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? "Guardando…" : editing ? "Guardar cambios" : "Guardar cotización"}
          </button>
          <button type="button" disabled title="Próximamente" className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-400">
            Descargar cotización
          </button>
        </div>
      </div>

      {modalTipo && (
        <AgregarItemModal
          tipo={modalTipo}
          insumos={insumos}
          profesionales={profesionales}
          materiales={materiales}
          onClose={() => setModalTipo(null)}
          onConfirm={agregarItem}
        />
      )}
    </div>
  );
}

function Linea({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-neutral-600">
      <span>{label}</span>
      <span>{money.format(valor)}</span>
    </div>
  );
}

function Campo({ label, children, full2, required }: { label: string; children: React.ReactNode; full2?: boolean; required?: boolean }) {
  return (
    <label className={`block text-sm ${full2 ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-neutral-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function AgregarItemModal({
  tipo,
  insumos,
  profesionales,
  materiales,
  onClose,
  onConfirm,
}: {
  tipo: "insumo" | "profesional" | "material";
  insumos: Insumo[];
  profesionales: Profesional[];
  materiales: Material[];
  onClose: () => void;
  onConfirm: (item: ItemPayload) => void;
}) {
  const unidadDefecto = tipo === "profesional" ? "h" : tipo === "material" ? "jornada" : "unidad";
  const [seleccion, setSeleccion] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState(unidadDefecto);

  const opciones =
    tipo === "insumo"
      ? insumos.map((i) => ({ value: i.id, label: `${i.codigo ? i.codigo + " — " : ""}${i.descripcion}` }))
      : tipo === "profesional"
        ? profesionales.map((p) => ({ value: p.id, label: `${p.nombre}${p.perfil ? " — " + p.perfil : ""}` }))
        : materiales.map((m) => ({ value: m.id, label: `${m.codigo ? m.codigo + " — " : ""}${m.nombre}` }));

  const titulo = tipo === "profesional" ? "profesional" : tipo === "material" ? "material" : "insumo";

  function confirmar() {
    if (!seleccion) return;
    let descripcion = "";
    let costo = 0;
    if (tipo === "insumo") {
      const x = insumos.find((i) => i.id === seleccion);
      if (!x) return;
      descripcion = x.descripcion;
      costo = Number(x.costo) || 0;
    } else if (tipo === "profesional") {
      const x = profesionales.find((p) => p.id === seleccion);
      if (!x) return;
      descripcion = `${x.nombre}${x.perfil ? " · " + x.perfil : ""}`;
      costo = Number(x.tarifa_hora) || 0;
    } else {
      const x = materiales.find((m) => m.id === seleccion);
      if (!x) return;
      descripcion = x.nombre;
      const vida = Number(x.vida_util_jornadas) || 1;
      costo = vida > 0 ? Number(x.valor_reposicion || 0) / vida : 0;
    }
    onConfirm({ tipo, descripcion, unidad, cantidad: Math.max(0.01, cantidad), costo_unitario: costo, precio_cliente_override: null });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 flex items-center gap-1.5 text-lg font-semibold text-emerald-900">
          <Plus size={18} /> Agregar {titulo} a la cotización
        </h2>

        <Campo label="Seleccionar del catálogo">
          <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)} className="in">
            <option value="">Seleccione…</option>
            {opciones.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Campo>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Campo label="Cantidad" required>
            <input type="number" min={0.01} step={0.01} value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="in" />
          </Campo>
          <Campo label="Unidad mostrada">
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className="in">
              <option value="h">h</option>
              <option value="unidad">unidad</option>
              <option value="jornada">jornada</option>
              <option value="día">día</option>
              <option value="min">min</option>
            </select>
          </Campo>
        </div>

        {opciones.length === 0 && (
          <p className="mt-3 text-xs text-amber-700">
            Todavía no hay {titulo}s en el catálogo. Créalo primero desde su página correspondiente en Catálogos.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
            Cancelar
          </button>
          <button type="button" disabled={!seleccion} onClick={confirmar} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

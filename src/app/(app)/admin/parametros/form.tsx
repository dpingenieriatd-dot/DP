"use client";

import { useState, useTransition } from "react";
import { actualizarSettings, actualizarEfectividadParametros } from "./actions";

type Settings = {
  admin_pct: number;
  margin_pct: number;
  iva_pct: number;
  monthly_expenses: number;
  monthly_income: number;
};

type Efectividad = {
  peso_cumplimiento: number;
  peso_oportunidad: number;
  peso_calidad: number;
  peso_equilibrio_carga: number;
  umbral_carga_equilibrada_pct: number;
  capacidad_semanal_estandar_horas: number;
};

export function ParametrosForm({ settings, efectividad }: { settings: Settings; efectividad: Efectividad }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function guardarSettings(fd: FormData) {
    startTransition(async () => {
      const r = await actualizarSettings(fd);
      setMsg(r?.error || "Configuración financiera guardada.");
    });
  }

  function guardarEfectividad(fd: FormData) {
    startTransition(async () => {
      const r = await actualizarEfectividadParametros(fd);
      setMsg(r?.error || "Parámetros de efectividad guardados.");
    });
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Parámetros del negocio</h1>
      {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <form action={guardarSettings} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">Configuración financiera</h2>
          <p className="text-xs text-neutral-500">Valores por defecto para proyectos nuevos (cada proyecto puede tener su propio % administrativo).</p>
          <Campo label="Costos administrativos (%)">
            <input type="number" step="0.1" name="admin_pct" defaultValue={settings?.admin_pct ?? 15} className="in" />
          </Campo>
          <Campo label="Margen de utilidad objetivo (%)">
            <input type="number" step="0.1" name="margin_pct" defaultValue={settings?.margin_pct ?? 30} className="in" />
          </Campo>
          <Campo label="IVA predeterminado (%)">
            <input type="number" step="0.1" name="iva_pct" defaultValue={settings?.iva_pct ?? 19} className="in" />
          </Campo>
          <Campo label="Gastos mensuales de la empresa">
            <input type="number" name="monthly_expenses" defaultValue={settings?.monthly_expenses ?? 0} className="in" />
          </Campo>
          <Campo label="Ingresos mensuales promedio">
            <input type="number" name="monthly_income" defaultValue={settings?.monthly_income ?? 0} className="in" />
          </Campo>
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            Guardar configuración
          </button>
        </form>

        <form action={guardarEfectividad} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-semibold text-emerald-900">Parámetros de Efectividad (Seguimiento)</h2>
          <p className="text-xs text-neutral-500">
            El componente de calidad ({efectividad?.peso_calidad ?? 15}%) queda guardado pero todavía no se calcula —
            falta definir con D&P cómo calificar un entregable.
          </p>
          <Campo label="Peso cumplimiento (%)">
            <input type="number" step="1" name="peso_cumplimiento" defaultValue={efectividad?.peso_cumplimiento ?? 50} className="in" />
          </Campo>
          <Campo label="Peso oportunidad (%)">
            <input type="number" step="1" name="peso_oportunidad" defaultValue={efectividad?.peso_oportunidad ?? 25} className="in" />
          </Campo>
          <Campo label="Peso calidad (%)">
            <input type="number" step="1" name="peso_calidad" defaultValue={efectividad?.peso_calidad ?? 15} className="in" />
          </Campo>
          <Campo label="Peso equilibrio de carga (%)">
            <input type="number" step="1" name="peso_equilibrio_carga" defaultValue={efectividad?.peso_equilibrio_carga ?? 10} className="in" />
          </Campo>
          <Campo label="Umbral de carga equilibrada (%)">
            <input type="number" step="1" name="umbral_carga_equilibrada_pct" defaultValue={efectividad?.umbral_carga_equilibrada_pct ?? 90} className="in" />
          </Campo>
          <Campo label="Capacidad semanal estándar (horas)">
            <input type="number" step="1" name="capacidad_semanal_estandar_horas" defaultValue={efectividad?.capacidad_semanal_estandar_horas ?? 40} className="in" />
          </Campo>
          <button type="submit" disabled={pending} className="rounded-md bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
            Guardar parámetros
          </button>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

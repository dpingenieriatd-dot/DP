"use client";

import { useSyncExternalStore } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { money } from "@/lib/finance";

// Recharts pinta con hex real, no puede heredar var(--color-emerald-900) del
// CSS — así que leemos las variables del tema activo (ver /admin/temas) del
// DOM en vez de hardcodear los hex de un solo tema. No hay evento de cambio
// para estas variables, así que subscribe es un no-op: alcanza con leerlas
// una vez en el cliente (getSnapshot) y usar el fallback durante el SSR.
const FALLBACK_COLORS = ["#27500a", "#639922", "#ba7517", "#a1d56d", "#8e570c", "#d9eac8"];
const CSS_VARS = ["--color-emerald-900", "--color-emerald-800", "--color-amber-600", "--color-emerald-400", "--color-amber-800", "--color-emerald-200"];

const noopSubscribe = () => () => {};

// useSyncExternalStore exige que getSnapshot devuelva la MISMA referencia si
// nada cambió (si no, React la trata como un cambio en cada render). Se
// cachea a nivel de módulo y solo se genera un array nuevo si el hex leído
// realmente difiere del último — así el tema solo se relee de verdad si
// cambió entre una carga de página y otra.
let cachedColors: string[] = FALLBACK_COLORS;
let cachedKey = "";

function getSnapshot() {
  const styles = getComputedStyle(document.documentElement);
  const resolved = CSS_VARS.map((v, i) => styles.getPropertyValue(v).trim() || FALLBACK_COLORS[i]);
  const key = resolved.join(",");
  if (key !== cachedKey) {
    cachedColors = resolved;
    cachedKey = key;
  }
  return cachedColors;
}

function useThemeColors() {
  return useSyncExternalStore(noopSubscribe, getSnapshot, () => FALLBACK_COLORS);
}

/** Version corta para ejes (ej. $15,3M) — el valor completo se sigue viendo en el tooltip. */
function compactMoney(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return "$" + (v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "M";
  if (abs >= 1_000) return "$" + (v / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 0 }) + "K";
  return money.format(v);
}

export function PieCard({
  title,
  subtitle,
  centerLabel,
  data,
}: {
  title: string;
  subtitle?: string;
  centerLabel?: string;
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = useThemeColors();
  const chartData = total === 0 ? [{ name: "_empty", value: 1 }] : data;
  const chartColors = total === 0 ? ["#e5e5e5"] : colors;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="font-semibold text-emerald-900">{title}</div>
      {subtitle && <div className="text-xs text-neutral-500">{subtitle}</div>}
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative h-[170px] w-[170px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>
              {total > 0 && (
                <Tooltip
                  formatter={(value, name) => {
                    const v = Number(value);
                    return [`${v} (${Math.round((v / total) * 100)}%)`, name];
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-emerald-900">{total}</div>
            {centerLabel && <div className="text-[11px] text-neutral-500">{centerLabel}</div>}
          </div>
        </div>
        <div className="w-full flex-1 text-sm">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between border-b border-neutral-100 py-1.5 last:border-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
                <span className="truncate text-neutral-700">{d.name}</span>
              </div>
              <span className="shrink-0 text-neutral-500">
                {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BarCard({
  title,
  data,
  valueLabel,
  format,
}: {
  title: string;
  data: { name: string; value: number }[];
  valueLabel?: string;
  /** "money" formatea con el mismo formato de pesos colombianos usado en toda la app. */
  format?: "money";
}) {
  const fmt = (v: number) => (format === "money" ? money.format(v) : String(v));
  const fmtAxis = (v: number) => (format === "money" ? compactMoney(v) : String(v));
  const truncate = (name: string) => (name.length > 20 ? name.slice(0, 19) + "…" : name);
  const colors = useThemeColors();

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{title}</div>
      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-neutral-400">Sin datos todavía</div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={70}
                tickFormatter={truncate}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtAxis} width={70} />
              <Tooltip formatter={(v) => fmt(Number(v))} labelFormatter={(name) => name} />
              <Bar dataKey="value" name={valueLabel ?? "Valor"} fill={colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

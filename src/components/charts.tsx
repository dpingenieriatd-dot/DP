"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { money } from "@/lib/finance";

// Paleta de marca D&P: verde oscuro / verde principal / ámbar / tintes claros.
const COLORS = ["#27500a", "#639922", "#ba7517", "#a1d56d", "#8e570c", "#d9eac8"];

/** Version corta para ejes (ej. $15,3M) — el valor completo se sigue viendo en el tooltip. */
function compactMoney(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return "$" + (v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "M";
  if (abs >= 1_000) return "$" + (v / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 0 }) + "K";
  return money.format(v);
}

export function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{title}</div>
      {total === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-neutral-400">Sin datos todavía</div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
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
              <Bar dataKey="value" name={valueLabel ?? "Valor"} fill="#27500a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

type Color = "emerald" | "red" | "amber" | "blue" | "violet" | "neutral";

const BORDER: Record<Color, string> = {
  emerald: "border-t-emerald-600",
  red: "border-t-red-600",
  amber: "border-t-amber-500",
  blue: "border-t-blue-600",
  violet: "border-t-violet-600",
  neutral: "border-t-neutral-300",
};

export function KpiCard({
  label,
  value,
  subtitle,
  color = "emerald",
  action,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: Color;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-neutral-200 border-t-4 bg-white p-4 ${BORDER[color]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-emerald-900">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-neutral-400">{subtitle}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

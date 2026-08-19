export function Topbar({
  title,
  subtitle,
  userLabel,
  filter,
  actions,
}: {
  title: string;
  subtitle?: string;
  userLabel?: string;
  filter?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-8 py-4">
      <div>
        <h1 className="text-2xl font-semibold text-emerald-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {userLabel && (
          <div className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600">{userLabel}</div>
        )}
        {filter}
        {actions}
      </div>
    </div>
  );
}

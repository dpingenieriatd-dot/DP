"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setResponsableFiltro } from "@/lib/responsable-filtro-actions";

type Profile = { id: string; full_name: string | null; email: string | null };

export function ResponsableFiltro({ profiles, value }: { profiles: Profile[]; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(id: string) {
    startTransition(async () => {
      await setResponsableFiltro(id);
      router.refresh();
    });
  }

  return (
    <select
      defaultValue={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      title="Filtrar visualización por responsable"
      className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-60"
    >
      <option value="">Todos</option>
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.full_name || p.email}
        </option>
      ))}
    </select>
  );
}

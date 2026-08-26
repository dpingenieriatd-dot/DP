import type { SupabaseClient } from "@supabase/supabase-js";

/** "PREFIJO-001", "PREFIJO-002"... igual a nextCode() del HTML de referencia. */
export async function siguienteCodigo(supabase: SupabaseClient, table: string, prefix: string) {
  const { data } = await supabase.from(table).select("codigo").ilike("codigo", `${prefix}-%`);
  let max = 0;
  for (const row of data ?? []) {
    const m = String(row.codigo ?? "").match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

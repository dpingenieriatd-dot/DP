import { createClient } from "@/lib/supabase/server";

const NOMBRES_TABLA: Record<string, string> = {
  proyectos: "Proyectos",
  compras: "Compras",
  settings: "Parámetros financieros",
};

const CAMPOS_IGNORADOS = new Set(["updated_at", "created_at"]);

type Valores = Record<string, unknown> | null;

function diffCampos(anterior: Valores, nuevo: Valores) {
  if (!anterior || !nuevo) return [];
  const claves = new Set([...Object.keys(anterior), ...Object.keys(nuevo)]);
  const cambios: { campo: string; antes: unknown; despues: unknown }[] = [];
  for (const k of claves) {
    if (CAMPOS_IGNORADOS.has(k)) continue;
    if (JSON.stringify(anterior[k]) !== JSON.stringify(nuevo[k])) {
      cambios.push({ campo: k, antes: anterior[k], despues: nuevo[k] });
    }
  }
  return cambios;
}

function formatValor(v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return String(v);
}

type Registro = {
  id: string;
  tabla: string;
  registro_id: string;
  accion: "INSERT" | "UPDATE" | "DELETE";
  valores_anteriores: Valores;
  valores_nuevos: Valores;
  creado_en: string;
  profiles: { full_name: string | null; email: string | null } | null;
};

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };

  if (miPerfil?.role !== "admin") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-emerald-900">Auditoría</h1>
        <p className="mt-2 text-sm text-neutral-500">Solo un administrador puede ver esta sección.</p>
      </div>
    );
  }

  const { data: registros } = await supabase
    .from("auditoria")
    .select("id, tabla, registro_id, accion, valores_anteriores, valores_nuevos, creado_en, profiles(full_name, email)")
    .order("creado_en", { ascending: false })
    .limit(200);

  const filas = (registros ?? []) as unknown as Registro[];

  return (
    <div className="flex flex-col p-8 lg:h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-emerald-900">Auditoría</h1>
        <p className="text-sm text-neutral-500">
          Historial de cambios en Proyectos, Compras y Parámetros financieros — quién, cuándo y qué cambió. Últimos 200 registros.
        </p>
      </div>

      <div className="min-h-[360px] overflow-auto rounded-lg border border-neutral-200 bg-white lg:min-h-0 lg:flex-1">
        <table className="w-full min-w-[900px] text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase text-neutral-500">
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Fecha</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Tabla</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Acción</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Usuario</th>
              <th className="sticky top-0 z-10 bg-neutral-50 px-3 py-2">Cambios</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => {
              const cambios = r.accion === "UPDATE" ? diffCampos(r.valores_anteriores, r.valores_nuevos) : [];
              return (
                <tr key={r.id} className="border-t border-neutral-100 align-top hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-3 py-2 text-neutral-500">{new Date(r.creado_en).toLocaleString("es-CO")}</td>
                  <td className="px-3 py-2 font-medium text-neutral-700">{NOMBRES_TABLA[r.tabla] ?? r.tabla}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        r.accion === "INSERT" ? "bg-emerald-100 text-emerald-700" : r.accion === "DELETE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.accion === "INSERT" ? "Creado" : r.accion === "DELETE" ? "Eliminado" : "Editado"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{r.profiles?.full_name || r.profiles?.email || "—"}</td>
                  <td className="px-3 py-2">
                    {r.accion === "UPDATE" ? (
                      cambios.length ? (
                        <ul className="space-y-0.5">
                          {cambios.map((c) => (
                            <li key={c.campo}>
                              <span className="font-medium text-neutral-700">{c.campo}</span>: {formatValor(c.antes)} → {formatValor(c.despues)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-neutral-400">Sin cambios detectables</span>
                      )
                    ) : (
                      <span className="text-neutral-400">registro_id: {r.registro_id}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-neutral-400">
                  Sin registros de auditoría todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

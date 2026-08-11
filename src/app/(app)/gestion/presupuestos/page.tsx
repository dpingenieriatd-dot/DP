import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/finance";

export default async function Page() {
  const supabase = await createClient();

  const [{ data: proyectos }, { data: compras }, { data: clientes }] = await Promise.all([
    supabase.from("proyectos").select("id, codigo, nombre, cliente_id, presupuesto_directo, estado").eq("archivado", false).order("nombre"),
    supabase.from("compras").select("proyecto_id, cantidad, valor_unitario"),
    supabase.from("clientes").select("id, nombre"),
  ]);

  const clienteNombre = (id: string | null) => clientes?.find((c) => c.id === id)?.nombre ?? "—";

  const filas = (proyectos ?? []).map((p) => {
    const ejecutado = (compras ?? [])
      .filter((c) => c.proyecto_id === p.id)
      .reduce((a, c) => a + Number(c.cantidad) * Number(c.valor_unitario), 0);
    const pctEjecutado = p.presupuesto_directo > 0 ? (ejecutado / p.presupuesto_directo) * 100 : 0;
    const saldo = Number(p.presupuesto_directo) - ejecutado;
    return { p, ejecutado, pctEjecutado, saldo };
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Presupuestos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Control de costos directos por proyecto. Para agregar recursos al presupuesto, entra al detalle del proyecto
        respectivo.
      </p>

      <div className="mt-4 overflow-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
              <th className="px-3 py-2">Proyecto</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2 text-right">Presupuesto directo</th>
              <th className="px-3 py-2 text-right">Ejecutado (compras)</th>
              <th className="px-3 py-2">% ejecutado</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ p, ejecutado, pctEjecutado, saldo }) => (
              <tr key={p.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/gestion/proyectos/${p.id}`} className="font-medium text-emerald-700 hover:underline">
                    {p.codigo ? `${p.codigo} · ` : ""}
                    {p.nombre}
                  </Link>
                </td>
                <td className="px-3 py-2">{clienteNombre(p.cliente_id)}</td>
                <td className="px-3 py-2 text-right">{money.format(p.presupuesto_directo)}</td>
                <td className="px-3 py-2 text-right">{money.format(ejecutado)}</td>
                <td className="px-3 py-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className={`h-full ${pctEjecutado > 100 ? "bg-red-500" : "bg-emerald-600"}`}
                      style={{ width: `${Math.min(100, pctEjecutado)}%` }}
                    />
                  </div>
                  <span className="text-xs text-neutral-500">{pctEjecutado.toFixed(0)}%</span>
                </td>
                <td className={`px-3 py-2 text-right ${saldo < 0 ? "text-red-600" : ""}`}>{money.format(saldo)}</td>
                <td className="px-3 py-2">{p.estado}</td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                  No hay proyectos con presupuesto registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

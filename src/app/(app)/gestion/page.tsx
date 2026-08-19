import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, money } from "@/lib/finance";
import { CrecimientoFiltro } from "./crecimiento-filtro";
import { MESES } from "@/lib/meses";

/** Cascada de fecha del proyecto, igual intención que el HTML V24: fecha_inicio del proyecto, si no fecha de creación. */
function fechaProyecto(p: { fecha_inicio: string | null; created_at: string }) {
  return (p.fecha_inicio || p.created_at).slice(0, 7); // YYYY-MM
}

function pctTexto(actual: number, previo: number) {
  if (previo === 0) return actual === 0 ? "—" : "Sin base previa";
  const pct = ((actual - previo) / Math.abs(previo)) * 100;
  const signo = pct >= 0 ? "+" : "";
  return `${signo}${pct.toFixed(1)}%`;
}

export default async function GestionInicioPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string; cliente?: string; empresa?: string }>;
}) {
  const { anio: anioParam, mes: mesParam, cliente: clienteFiltro, empresa: empresaFiltro } = await searchParams;
  const supabase = await createClient();

  const [{ data: proyectos }, { data: clientes }, { data: empresas }, { data: presupuestos }, { data: costos }] = await Promise.all([
    supabase.from("proyectos").select("id, codigo, nombre, cliente_id, empresa_id, estado, fecha_inicio, created_at").eq("archivado", false),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("empresas_atendidas").select("id, nombre").order("nombre"),
    supabase.from("presupuestos").select("*"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
  ]);

  const nombreCliente = (id: string | null) => clientes?.find((c) => c.id === id)?.nombre ?? "—";
  const nombreEmpresa = (id: string | null) => empresas?.find((e) => e.id === id)?.nombre ?? "—";

  const metricaProyecto = (proyectoId: string) => {
    const pre = (presupuestos ?? []).filter((p) => p.proyecto_id === proyectoId);
    let valor = 0;
    let utilidad = 0;
    for (const p of pre) {
      const f = calcularPresupuesto(p);
      const items = (costos ?? []).filter((c) => c.presupuesto_id === p.id);
      const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
      valor += f.valorCotizado;
      utilidad += control.gananciaActual;
    }
    return { valor, utilidad };
  };

  const todos = (proyectos ?? []).map((p) => ({ ...p, _fecha: fechaProyecto(p), ...metricaProyecto(p.id) }));

  const anios = [...new Set(todos.map((p) => Number(p._fecha.slice(0, 4))))].filter((a) => a >= 2000 && a <= 2100).sort();
  const anioActual = anioParam ? Number(anioParam) : anios[anios.length - 1] ?? new Date().getFullYear();
  const mesActual = mesParam ? Number(mesParam) : null;

  const delPeriodo = todos.filter((p) => {
    const [y, m] = p._fecha.split("-").map(Number);
    if (y !== anioActual) return false;
    if (mesActual && m !== mesActual) return false;
    if (clienteFiltro && p.cliente_id !== clienteFiltro) return false;
    if (empresaFiltro && p.empresa_id !== empresaFiltro) return false;
    return true;
  });

  // Período de comparación: mes anterior del mismo año, o año anterior completo si no hay mes elegido.
  let previo: typeof todos = [];
  let compareLabel = "";
  if (mesActual) {
    if (mesActual === 1) {
      previo = [];
      compareLabel = "sin mes anterior en el año";
    } else {
      previo = todos.filter((p) => p._fecha === `${anioActual}-${String(mesActual - 1).padStart(2, "0")}`);
      compareLabel = `vs. ${MESES[mesActual - 2]}`;
    }
  } else {
    previo = todos.filter((p) => Number(p._fecha.slice(0, 4)) === anioActual - 1);
    compareLabel = `vs. ${anioActual - 1}`;
  }

  const sum = (arr: typeof todos, key: "valor" | "utilidad") => arr.reduce((s, p) => s + p[key], 0);
  const utilidadPeriodo = sum(delPeriodo, "utilidad");
  const utilidadPrevio = sum(previo, "utilidad");
  const valorAprobado = sum(delPeriodo, "valor");
  const clientesAtendidos = new Set(delPeriodo.map((p) => p.cliente_id).filter(Boolean)).size;
  const empresasAtendidas = new Set(delPeriodo.map((p) => p.empresa_id).filter(Boolean)).size;

  // Evolución mensual del año (sin filtro de mes, respeta cliente/empresa)
  const delAnio = todos.filter((p) => {
    const y = Number(p._fecha.slice(0, 4));
    if (y !== anioActual) return false;
    if (clienteFiltro && p.cliente_id !== clienteFiltro) return false;
    if (empresaFiltro && p.empresa_id !== empresaFiltro) return false;
    return true;
  });
  const evolucion = MESES.map((nombreMes, i) => {
    const mesNum = i + 1;
    const deEsteMes = delAnio.filter((p) => Number(p._fecha.slice(5, 7)) === mesNum);
    const deMesAnterior = mesNum > 1 ? delAnio.filter((p) => Number(p._fecha.slice(5, 7)) === mesNum - 1) : [];
    return {
      mes: nombreMes,
      valor: sum(deEsteMes, "valor"),
      utilidad: sum(deEsteMes, "utilidad"),
      proyectos: deEsteMes.length,
      clientes: new Set(deEsteMes.map((p) => p.cliente_id).filter(Boolean)).size,
      empresas: new Set(deEsteMes.map((p) => p.empresa_id).filter(Boolean)).size,
      variacion: pctTexto(sum(deEsteMes, "utilidad"), sum(deMesAnterior, "utilidad")),
    };
  }).filter((m) => m.proyectos > 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Inicio</h1>
      <p className="mt-1 text-sm text-neutral-500">Crecimiento y rentabilidad con la información registrada.</p>

      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-1 font-semibold text-emerald-900">Analizar crecimiento</div>
        <div className="mb-3 text-xs text-neutral-500">
          Clientes y empresas del período corresponden a los que tienen proyectos registrados en ese mes/año.
        </div>
        <CrecimientoFiltro anios={anios.length ? anios : [new Date().getFullYear()]} clientes={clientes ?? []} empresas={empresas ?? []} />
      </div>

      <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        <strong>Cómo leer el crecimiento:</strong> el tablero cuenta clientes y empresas según los proyectos registrados en cada período y calcula la utilidad desde el presupuesto/costo vigente.
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Utilidad del período" valor={money.format(utilidadPeriodo)} sub={`${pctTexto(utilidadPeriodo, utilidadPrevio)} ${compareLabel}`} />
        <Kpi label="Valor aprobado" valor={money.format(valorAprobado)} sub="Proyectos del filtro" />
        <Kpi label="Proyectos" valor={delPeriodo.length} sub="En el período seleccionado" />
        <Kpi label="Clientes atendidos" valor={clientesAtendidos} sub={`Base general: ${clientes?.length ?? 0}`} />
        <Kpi label="Empresas atendidas" valor={empresasAtendidas} sub={`Base general: ${empresas?.length ?? 0}`} />
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-1 font-semibold text-emerald-900">Evolución mensual {anioActual}</div>
        <div className="mb-3 text-xs text-neutral-500">Meses con actividad registrada.</div>
        <div className="overflow-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase text-neutral-500">
                <th className="px-3 py-2">Mes</th>
                <th className="px-3 py-2 text-right">Valor aprobado</th>
                <th className="px-3 py-2 text-right">Utilidad</th>
                <th className="px-3 py-2 text-right">Proyectos</th>
                <th className="px-3 py-2 text-right">Clientes</th>
                <th className="px-3 py-2 text-right">Empresas</th>
                <th className="px-3 py-2 text-right">Variación utilidad</th>
              </tr>
            </thead>
            <tbody>
              {evolucion.map((m) => (
                <tr key={m.mes} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{m.mes}</td>
                  <td className="px-3 py-2 text-right">{money.format(m.valor)}</td>
                  <td className={`px-3 py-2 text-right ${m.utilidad < 0 ? "text-red-600" : ""}`}>{money.format(m.utilidad)}</td>
                  <td className="px-3 py-2 text-right">{m.proyectos}</td>
                  <td className="px-3 py-2 text-right">{m.clientes}</td>
                  <td className="px-3 py-2 text-right">{m.empresas}</td>
                  <td className="px-3 py-2 text-right">{m.variacion}</td>
                </tr>
              ))}
              {evolucion.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-neutral-400">
                    No hay proyectos con fecha registrada para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-1 font-semibold text-emerald-900">Proyectos del período</div>
        <div className="mb-3 text-xs text-neutral-500">Estos registros explican los indicadores anteriores.</div>
        <div className="overflow-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="text-left text-[11px] uppercase text-neutral-500">
                <th className="px-3 py-2">Proyecto</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Empresa</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Valor aprobado</th>
                <th className="px-3 py-2 text-right">Utilidad</th>
              </tr>
            </thead>
            <tbody>
              {delPeriodo.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{p.codigo || "—"}</td>
                  <td className="px-3 py-2">{p.nombre}</td>
                  <td className="px-3 py-2">{nombreCliente(p.cliente_id)}</td>
                  <td className="px-3 py-2">{nombreEmpresa(p.empresa_id)}</td>
                  <td className="px-3 py-2">{p._fecha}</td>
                  <td className="px-3 py-2">{p.estado}</td>
                  <td className="px-3 py-2 text-right">{money.format(p.valor)}</td>
                  <td className={`px-3 py-2 text-right ${p.utilidad < 0 ? "text-red-600" : ""}`}>{money.format(p.utilidad)}</td>
                </tr>
              ))}
              {delPeriodo.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-neutral-400">
                    No hay proyectos para el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, valor, sub }: { label: string; valor: string | number; sub: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-emerald-900">{valor}</div>
      <div className="text-xs text-neutral-400">{sub}</div>
    </div>
  );
}

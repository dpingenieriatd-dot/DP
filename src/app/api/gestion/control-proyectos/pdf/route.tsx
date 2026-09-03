import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/finance";
import { construirFilasControl, resumenControl, etiquetaPlata, etiquetaTiempo, EN_CURSO } from "@/lib/control-proyectos";
import { TableReportDoc, type Column } from "@/lib/pdf/table-doc";

const COLUMNS: Column[] = [
  { key: "proyecto", label: "Proyecto", width: 2.7 },
  { key: "cliente", label: "Cliente", width: 2 },
  { key: "aprobado", label: "Aprobado", width: 1.3 },
  { key: "presupuesto", label: "Presupuesto", width: 1.3 },
  { key: "gastado", label: "Gastado", width: 1.3 },
  { key: "disponible", label: "Disponible", width: 1.3 },
  { key: "ganancia", label: "Ganancia real", width: 1.4 },
  { key: "plata", label: "Plata", width: 1.9 },
  { key: "tiempo", label: "Tiempo", width: 1.3 },
];

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const clienteId = new URL(req.url).searchParams.get("cliente");

  const [{ data: proyectos }, { data: presupuestos }, { data: costos }, { data: compras }, { data: settings }, { data: clientes }] =
    await Promise.all([
      supabase.from("proyectos").select("id, codigo, nombre, cliente_id, estado, fecha_fin").eq("archivado", false),
      supabase.from("presupuestos").select("*"),
      supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado"),
      supabase.from("compras").select("proyecto_id, cantidad, valor_unitario, estado_pago, archivado").eq("archivado", false),
      supabase.from("settings").select("*").eq("id", 1).single(),
      supabase.from("clientes").select("id, nombre"),
    ]);

  const nombreCliente = (id: string | null) => clientes?.find((c) => c.id === id)?.nombre ?? "—";

  let filas = construirFilasControl({
    proyectos: (proyectos ?? []).map((p) => ({ ...p })),
    presupuestos: presupuestos ?? [],
    costos: costos ?? [],
    compras: compras ?? [],
    settings,
    nombreCliente,
  }).filter((r) => EN_CURSO.has(r.estado));

  const clienteNombre = clienteId ? nombreCliente(clienteId) : null;
  if (clienteId) filas = filas.filter((r) => r.clienteId === clienteId);

  const t = resumenControl(filas);
  const m = (v: number) => money.format(v);

  const rows = filas.map((r) => ({
    proyecto: `${r.codigo ?? "—"}  ${r.nombre}`,
    cliente: r.cliente,
    aprobado: r.sinValorAprobado ? "—" : m(r.valorAprobado),
    presupuesto: m(r.plan),
    gastado: m(r.comprometido),
    disponible: m(r.disponible),
    ganancia: r.sinValorAprobado ? "sin valor aprobado" : r.comprometido === 0 ? "sin compras aún" : m(r.gananciaReal),
    plata: etiquetaPlata(r.semaforoPlata),
    tiempo: etiquetaTiempo(r.tiempo, r.diasTiempo),
  }));

  const buffer = await renderToBuffer(
    <TableReportDoc
      title="Control de proyectos"
      subtitle={clienteNombre ? `Cliente: ${clienteNombre}` : "Todos los proyectos en curso"}
      kpis={[
        { label: "Proyectos en curso", value: String(t.activos) },
        { label: "Con alerta de plata", value: String(t.enRiesgo) },
        { label: "Atrasados", value: String(t.atrasados) },
        { label: "Ganancia proyectada", value: m(t.gananciaProyectada) },
        { label: `Ganancia real (${t.proyectosConCompras} con compras)`, value: t.proyectosConCompras === 0 ? "—" : m(t.gananciaReal) },
      ]}
      columns={COLUMNS}
      rows={rows}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="control-proyectos${clienteId ? "-cliente" : ""}.pdf"`,
    },
  });
}

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { calcularPresupuesto, calcularControlCostos, money } from "@/lib/finance";
import { TableReportDoc, type Column, type KpiItem } from "@/lib/pdf/table-doc";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ReportDoc = { title: string; subtitle?: string; kpis?: KpiItem[]; columns: Column[]; rows: Record<string, string>[] };

const fmtMoney = (v: number | null | undefined) => money.format(Number(v || 0));
const fmtDate = (v: string | null | undefined) => (v ? new Date(v + "T00:00:00").toLocaleDateString("es-CO") : "—");
const fmtPct = (v: number | null | undefined) => `${Number(v || 0).toFixed(1)}%`;

async function reporteResumen(supabase: SupabaseClient): Promise<ReportDoc> {
  const [{ data: tareas }, { data: proyectos }, { data: presupuestos }, { data: costos }, { data: clientes }, { data: actividades }] =
    await Promise.all([
      supabase.from("tareas").select("estado"),
      supabase.from("proyectos").select("id").eq("archivado", false),
      supabase.from("presupuestos").select("*"),
      supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
      supabase.from("clientes").select("id"),
      supabase.from("actividades").select("estado"),
    ]);

  let ingresos = 0;
  let ganancia = 0;
  let viables = 0;
  for (const pre of presupuestos ?? []) {
    const f = calcularPresupuesto(pre);
    const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
    const control = calcularControlCostos(items, f.valorCotizado, f.admin, f.iva);
    ingresos += f.valorCotizado;
    ganancia += control.gananciaEst;
    if (f.viable) viables += 1;
  }

  return {
    title: "Resumen ejecutivo",
    subtitle: "Estado general de Seguimiento y Gestión",
    columns: [],
    rows: [],
    kpis: [
      { label: "Tareas disponibles", value: String((tareas ?? []).filter((t) => t.estado === "Disponible").length) },
      { label: "Tareas en proceso", value: String((tareas ?? []).filter((t) => t.estado === "En proceso").length) },
      { label: "Tareas terminadas", value: String((tareas ?? []).filter((t) => t.estado === "Terminada").length) },
      { label: "Proyectos activos", value: String((proyectos ?? []).length) },
      { label: "Clientes", value: String((clientes ?? []).length) },
      { label: "Presupuestos", value: String((presupuestos ?? []).length) },
      { label: "Presupuestos viables", value: `${viables} de ${(presupuestos ?? []).length}` },
      { label: "Valor cotizado total", value: fmtMoney(ingresos) },
      { label: "Ganancia estimada total", value: fmtMoney(ganancia) },
      { label: "Actividades cumplidas", value: String((actividades ?? []).filter((a) => a.estado === "Cumplido").length) },
    ],
  };
}

async function reporteProyectos(supabase: SupabaseClient): Promise<ReportDoc> {
  const [{ data: proyectos }, { data: presupuestos }, { data: costos }] = await Promise.all([
    supabase.from("proyectos").select("*, clientes(nombre), empresas_atendidas(nombre)").order("created_at", { ascending: false }),
    supabase.from("presupuestos").select("*"),
    supabase.from("presupuesto_costos").select("presupuesto_id, presupuestado, real"),
  ]);

  const rows = (proyectos ?? []).map((p) => {
    const presDelProyecto = (presupuestos ?? []).filter((pr) => pr.proyecto_id === p.id);
    let ganancia = 0;
    for (const pre of presDelProyecto) {
      const f = calcularPresupuesto(pre);
      const items = (costos ?? []).filter((c) => c.presupuesto_id === pre.id);
      ganancia += calcularControlCostos(items, f.valorCotizado, f.admin, f.iva).gananciaEst;
    }
    return {
      codigo: p.codigo ?? "—",
      nombre: p.nombre,
      cliente: p.clientes?.nombre ?? "—",
      empresa: p.empresas_atendidas?.nombre ?? "—",
      estado: p.estado,
      presupuestos: String(presDelProyecto.length),
      ganancia: fmtMoney(ganancia),
    };
  });

  return {
    title: "Proyectos",
    subtitle: "Listado general con ganancia estimada",
    columns: [
      { key: "codigo", label: "Código", width: 0.7 },
      { key: "nombre", label: "Proyecto", width: 2 },
      { key: "cliente", label: "Cliente", width: 1.6 },
      { key: "empresa", label: "Empresa atendida", width: 1.6 },
      { key: "estado", label: "Estado", width: 1 },
      { key: "presupuestos", label: "# Presup.", width: 0.7 },
      { key: "ganancia", label: "Ganancia estimada", width: 1.2 },
    ],
    rows,
  };
}

async function reportePresupuestos(supabase: SupabaseClient, proyectoId?: string | null): Promise<ReportDoc> {
  let query = supabase.from("presupuestos").select("*, proyectos(nombre)").order("created_at", { ascending: false });
  if (proyectoId) query = query.eq("proyecto_id", proyectoId);
  const { data: presupuestos } = await query;

  const rows = (presupuestos ?? []).map((p) => {
    const f = calcularPresupuesto(p);
    return {
      codigo: p.codigo ?? "—",
      proyecto: p.proyectos?.nombre ?? "—",
      costos: fmtMoney(f.costos),
      admin: fmtMoney(f.admin),
      utilidad: fmtMoney(f.utilidadEsperada),
      iva: fmtMoney(f.iva),
      sugerido: fmtMoney(f.valorSugerido),
      cotizado: fmtMoney(f.valorCotizado),
      viable: f.viable ? "Viable" : "No viable",
    };
  });

  let kpis: KpiItem[] | undefined;
  let subtitle = "Costos, utilidad esperada e IVA por presupuesto";
  if (proyectoId) {
    const totalCostos = (presupuestos ?? []).reduce((a, p) => a + calcularPresupuesto(p).costos, 0);
    const totalCotizado = (presupuestos ?? []).reduce((a, p) => a + calcularPresupuesto(p).valorCotizado, 0);
    const nombreProyecto = presupuestos?.[0]?.proyectos?.nombre;
    subtitle = `Filtrado por proyecto: ${nombreProyecto ?? "—"}`;
    kpis = [
      { label: "Presupuestos", value: String((presupuestos ?? []).length) },
      { label: "Total costos", value: fmtMoney(totalCostos) },
      { label: "Total valor cotizado", value: fmtMoney(totalCotizado) },
    ];
  }

  return {
    title: "Presupuestos",
    subtitle,
    kpis,
    columns: [
      { key: "codigo", label: "Código", width: 0.7 },
      { key: "proyecto", label: "Proyecto", width: 1.8 },
      { key: "costos", label: "Costos", width: 1 },
      { key: "admin", label: "Admin.", width: 1 },
      { key: "utilidad", label: "Utilidad esp.", width: 1 },
      { key: "iva", label: "IVA", width: 1 },
      { key: "sugerido", label: "Valor sugerido", width: 1.1 },
      { key: "cotizado", label: "Valor cotizado", width: 1.1 },
      { key: "viable", label: "Viabilidad", width: 0.9 },
    ],
    rows,
  };
}

async function reporteCotizaciones(supabase: SupabaseClient): Promise<ReportDoc> {
  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("*, clientes(nombre), empresas_atendidas(nombre)")
    .order("fecha", { ascending: false });

  const rows = (cotizaciones ?? []).map((c) => ({
    codigo: c.codigo ?? "—",
    nombre: c.nombre,
    cliente: c.clientes?.nombre ?? "—",
    empresa: c.empresas_atendidas?.nombre ?? "—",
    fecha: fmtDate(c.fecha),
    cotizado: fmtMoney(c.valor_cotizado),
    estado: c.estado,
  }));

  return {
    title: "Cotizaciones",
    subtitle: "Histórico de cotizaciones enviadas a clientes",
    columns: [
      { key: "codigo", label: "Código", width: 0.7 },
      { key: "nombre", label: "Nombre", width: 2 },
      { key: "cliente", label: "Cliente", width: 1.6 },
      { key: "empresa", label: "Empresa atendida", width: 1.6 },
      { key: "fecha", label: "Fecha", width: 0.8 },
      { key: "cotizado", label: "Valor cotizado", width: 1.1 },
      { key: "estado", label: "Estado", width: 0.9 },
    ],
    rows,
  };
}

async function reporteCompras(supabase: SupabaseClient, proyectoId?: string | null): Promise<ReportDoc> {
  let query = supabase.from("compras").select("*, proyectos(nombre), proveedores(nombre)").order("fecha", { ascending: false });
  if (proyectoId) query = query.eq("proyecto_id", proyectoId);
  const { data: compras } = await query;

  const totalFila = (c: { cantidad: number | null; valor_unitario: number | null }) =>
    Number(c.cantidad || 0) * Number(c.valor_unitario || 0);

  const rows = (compras ?? []).map((c) => ({
    fecha: fmtDate(c.fecha),
    proyecto: c.proyectos?.nombre ?? "—",
    proveedor: c.proveedores?.nombre ?? "—",
    cantidad: String(c.cantidad ?? 0),
    unitario: fmtMoney(c.valor_unitario),
    total: fmtMoney(totalFila(c)),
    pagado: fmtMoney(c.valor_pagado),
    estado: c.estado_pago,
  }));

  let kpis: KpiItem[] | undefined;
  let subtitle = "Control de compras por proyecto y proveedor";
  if (proyectoId) {
    const totalGeneral = (compras ?? []).reduce((a, c) => a + totalFila(c), 0);
    const totalPagado = (compras ?? []).reduce((a, c) => a + Number(c.valor_pagado || 0), 0);
    const nombreProyecto = compras?.[0]?.proyectos?.nombre;
    subtitle = `Filtrado por proyecto: ${nombreProyecto ?? "—"}`;
    kpis = [
      { label: "Compras", value: String((compras ?? []).length) },
      { label: "Total", value: fmtMoney(totalGeneral) },
      { label: "Total pagado", value: fmtMoney(totalPagado) },
    ];
  }

  return {
    title: "Compras",
    subtitle,
    kpis,
    columns: [
      { key: "fecha", label: "Fecha", width: 0.8 },
      { key: "proyecto", label: "Proyecto", width: 1.8 },
      { key: "proveedor", label: "Proveedor", width: 1.6 },
      { key: "cantidad", label: "Cant.", width: 0.6 },
      { key: "unitario", label: "Vr. unitario", width: 1 },
      { key: "total", label: "Total", width: 1 },
      { key: "pagado", label: "Pagado", width: 1 },
      { key: "estado", label: "Estado", width: 0.9 },
    ],
    rows,
  };
}

async function reporteClientes(supabase: SupabaseClient): Promise<ReportDoc> {
  const { data: clientes } = await supabase.from("clientes").select("*").order("nombre");
  const rows = (clientes ?? []).map((c) => ({
    codigo: c.codigo ?? "—",
    nombre: c.nombre,
    nit: c.nit ?? "—",
    tipo: c.tipo ?? "—",
    sector: c.sector ?? "—",
    ciudad: c.ciudad ?? "—",
    estado: c.estado,
  }));
  return {
    title: "Clientes",
    subtitle: "Cartera de clientes",
    columns: [
      { key: "codigo", label: "Código", width: 0.7 },
      { key: "nombre", label: "Nombre", width: 2.2 },
      { key: "nit", label: "NIT", width: 1 },
      { key: "tipo", label: "Tipo", width: 1.2 },
      { key: "sector", label: "Sector", width: 1.2 },
      { key: "ciudad", label: "Ciudad", width: 1 },
      { key: "estado", label: "Estado", width: 0.8 },
    ],
    rows,
  };
}

async function reporteProveedores(supabase: SupabaseClient): Promise<ReportDoc> {
  const { data: proveedores } = await supabase.from("proveedores").select("*").order("nombre");
  const rows = (proveedores ?? []).map((p) => ({
    codigo: p.codigo ?? "—",
    nombre: p.nombre,
    nit: p.nit ?? "—",
    tipo: p.tipo ?? "—",
    ciudad: p.ciudad ?? "—",
    pago: p.forma_pago ?? "—",
    estado: p.estado,
  }));
  return {
    title: "Proveedores",
    subtitle: "Directorio de proveedores",
    columns: [
      { key: "codigo", label: "Código", width: 0.7 },
      { key: "nombre", label: "Nombre", width: 2.2 },
      { key: "nit", label: "NIT", width: 1 },
      { key: "tipo", label: "Tipo", width: 1.2 },
      { key: "ciudad", label: "Ciudad", width: 1 },
      { key: "pago", label: "Forma de pago", width: 1.2 },
      { key: "estado", label: "Estado", width: 0.8 },
    ],
    rows,
  };
}

async function reporteInsumos(supabase: SupabaseClient): Promise<ReportDoc> {
  const { data: insumos } = await supabase.from("insumos").select("*, proveedores(nombre)").order("categoria");
  const rows = (insumos ?? []).map((i) => ({
    codigo: i.codigo ?? "—",
    categoria: i.categoria ?? "—",
    descripcion: i.descripcion,
    unidad: i.unidad ?? "—",
    proveedor: i.proveedores?.nombre ?? "—",
    costo: fmtMoney(i.costo),
    estado: i.estado,
  }));
  return {
    title: "Banco de insumos",
    subtitle: "Catálogo de insumos con costo unitario",
    columns: [
      { key: "codigo", label: "Código", width: 0.7 },
      { key: "categoria", label: "Categoría", width: 1.3 },
      { key: "descripcion", label: "Descripción", width: 2.4 },
      { key: "unidad", label: "Unidad", width: 0.8 },
      { key: "proveedor", label: "Proveedor", width: 1.6 },
      { key: "costo", label: "Costo", width: 1 },
      { key: "estado", label: "Estado", width: 0.8 },
    ],
    rows,
  };
}

async function reporteTareas(supabase: SupabaseClient): Promise<ReportDoc> {
  const { data: tareas } = await supabase.from("tareas").select("*").order("fecha_limite", { ascending: true });
  const rows = (tareas ?? []).map((t) => ({
    titulo: t.titulo,
    cliente: t.cliente ?? "—",
    prioridad: t.prioridad,
    limite: fmtDate(t.fecha_limite),
    avance: fmtPct(t.avance_pct),
    estado: t.estado,
  }));
  return {
    title: "Banco de tareas",
    subtitle: "Estado del banco de tareas del equipo",
    columns: [
      { key: "titulo", label: "Tarea", width: 2.6 },
      { key: "cliente", label: "Cliente", width: 1.6 },
      { key: "prioridad", label: "Prioridad", width: 0.9 },
      { key: "limite", label: "Fecha límite", width: 1 },
      { key: "avance", label: "Avance", width: 0.8 },
      { key: "estado", label: "Estado", width: 1 },
    ],
    rows,
  };
}

async function reporteActividades(supabase: SupabaseClient): Promise<ReportDoc> {
  const { data: actividades } = await supabase.from("actividades").select("*").order("fecha", { ascending: false });
  const rows = (actividades ?? []).map((a) => ({
    fecha: fmtDate(a.fecha),
    cargo: a.cargo ?? "—",
    actividad: a.actividad,
    cliente: a.cliente ?? "—",
    estado: a.estado,
  }));
  return {
    title: "Actividades",
    subtitle: "Registro histórico de actividades del equipo",
    columns: [
      { key: "fecha", label: "Fecha", width: 0.8 },
      { key: "cargo", label: "Cargo", width: 1.5 },
      { key: "actividad", label: "Actividad", width: 2.6 },
      { key: "cliente", label: "Cliente", width: 1.6 },
      { key: "estado", label: "Estado", width: 1 },
    ],
    rows,
  };
}

const REPORTS: Record<string, (supabase: SupabaseClient, proyectoId?: string | null) => Promise<ReportDoc>> = {
  resumen: reporteResumen,
  proyectos: reporteProyectos,
  presupuestos: reportePresupuestos,
  cotizaciones: reporteCotizaciones,
  compras: reporteCompras,
  clientes: reporteClientes,
  proveedores: reporteProveedores,
  insumos: reporteInsumos,
  tareas: reporteTareas,
  actividades: reporteActividades,
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const build = REPORTS[slug];
  if (!build) return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const proyectoId = new URL(req.url).searchParams.get("proyecto_id");

  const doc = await build(supabase, proyectoId);
  const buffer = await renderToBuffer(<TableReportDoc {...doc} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dp-reporte-${slug}${proyectoId ? "-proyecto" : ""}.pdf"`,
    },
  });
}

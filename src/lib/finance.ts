export type ProyectoFinanzas = {
  presupuesto_directo: number;
  admin_pct: number | null;
  margen_pct: number;
  contrato_valor: number;
  iva_aplica: boolean;
  iva_pct: number;
  contrato_incluye_iva: boolean;
  retencion_pct: number;
  ica_pct: number;
  otras_retenciones: number;
};

export function calcularFinanzas(p: ProyectoFinanzas, adminPctPorDefecto: number, comprasEjecutadas: number) {
  const direct = Number(p.presupuesto_directo || 0);
  const adminPct = Number(p.admin_pct ?? adminPctPorDefecto ?? 15);
  const admin = (direct * adminPct) / 100;
  const totalCostoPresupuestado = direct + admin;

  const margenPct = Number(p.margen_pct || 30);
  const sugerido = margenPct < 100 ? totalCostoPresupuestado / (1 - margenPct / 100) : 0;

  const contrato = Number(p.contrato_valor || 0);
  const ivaPct = Number(p.iva_pct || 0);
  const baseValue = p.iva_aplica ? (p.contrato_incluye_iva ? contrato / (1 + ivaPct / 100) : contrato) : contrato;
  const ivaValue = p.iva_aplica ? (baseValue * ivaPct) / 100 : 0;
  const invoiceTotal = p.iva_aplica ? (p.contrato_incluye_iva ? contrato : baseValue + ivaValue) : baseValue;

  const retencionValue = (baseValue * Number(p.retencion_pct || 0)) / 100;
  const icaValue = (baseValue * Number(p.ica_pct || 0)) / 100;
  const netCash = invoiceTotal - retencionValue - icaValue - Number(p.otras_retenciones || 0);

  // Utilidad ESTIMADA: contra lo presupuestado (siempre disponible).
  const utilidadEstimada = baseValue - totalCostoPresupuestado;
  const margenEstimadoPct = baseValue > 0 ? (utilidadEstimada / baseValue) * 100 : 0;

  // Utilidad REAL: contra lo efectivamente comprado. Antes se mostraba
  // 100% cuando comprasEjecutadas=0 (nada gastado todavía) — eso era
  // enganoso, asi que solo se calcula cuando hay algo que comparar.
  const comprasAdmin = (comprasEjecutadas * adminPct) / 100;
  const costoRealTotal = comprasEjecutadas + comprasAdmin;
  const hayComprasRegistradas = comprasEjecutadas > 0;
  const utilidadReal = hayComprasRegistradas ? baseValue - costoRealTotal : null;
  const margenRealPct = hayComprasRegistradas && baseValue > 0 ? ((baseValue - costoRealTotal) / baseValue) * 100 : null;

  const desviacionPresupuesto = direct - comprasEjecutadas;

  let nivel: "green" | "yellow" | "orange" | "red" = "red";
  let etiqueta = "Pérdida";
  if (margenEstimadoPct >= margenPct) {
    nivel = "green";
    etiqueta = "Rentable";
  } else if (margenEstimadoPct >= 20) {
    nivel = "yellow";
    etiqueta = "Aceptable";
  } else if (margenEstimadoPct >= 10) {
    nivel = "orange";
    etiqueta = "Riesgo";
  } else if (margenEstimadoPct >= 0) {
    nivel = "red";
    etiqueta = "Muy baja utilidad";
  }

  return {
    direct,
    adminPct,
    admin,
    totalCostoPresupuestado,
    margenPct,
    sugerido,
    baseValue,
    ivaValue,
    invoiceTotal,
    retencionValue,
    icaValue,
    netCash,
    comprasEjecutadas,
    costoRealTotal,
    hayComprasRegistradas,
    utilidadEstimada,
    margenEstimadoPct,
    utilidadReal,
    margenRealPct,
    desviacionPresupuesto,
    nivel,
    etiqueta,
  };
}

export const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

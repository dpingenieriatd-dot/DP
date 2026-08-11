// Motor financiero de D&P — fórmulas verificadas al centavo contra 15
// presupuestos reales embebidos en el Anexo 2 (Panel_DP_Proyectos_Control_
// Presupuestal.html). No son una interpretación: se reconstruyeron
// resolviendo las ecuaciones contra esos datos históricos hasta que
// coincidieran de forma exacta.

export type PresupuestoBase = {
  costos: number;
  admin_pct: number;
  margen_pct: number;
  resp_iva: boolean;
  iva_pct: number;
  valor_cotizado: number;
};

export function calcularPresupuesto(p: PresupuestoBase) {
  const costos = Number(p.costos || 0);
  const adminPct = Number(p.admin_pct ?? 15);
  const margenPct = Number(p.margen_pct ?? 30);
  const ivaPct = Number(p.iva_pct ?? 19);

  const admin = costos * (adminPct / 100);
  // Margen de cost-plus calculado SOLO sobre "costos" (no sobre costos+admin).
  // Ej.: 30% -> costos * (30/70). Verificado exacto en los 15 registros reales.
  const utilidadEsperada = margenPct < 100 ? costos * (margenPct / (100 - margenPct)) : 0;
  const valor = costos + admin + utilidadEsperada;
  const iva = p.resp_iva ? valor * (ivaPct / 100) : 0;
  const valorSugerido = valor + iva;

  const valorCotizado = Number(p.valor_cotizado || 0);
  const margenNeg = valorCotizado - valorSugerido;
  const viable = margenNeg >= 0;

  return { costos, admin, utilidadEsperada, valor, iva, valorSugerido, valorCotizado, margenNeg, viable };
}

export type CostoItem = { presupuestado: number; real: number };

/**
 * plan/real = suma de las líneas de costo del presupuesto.
 * gananciaEst  = valor cotizado − lo PLANEADO − admin − iva (¿nos alcanza si todo sale como se presupuestó?)
 * gananciaActual = valor cotizado − lo REAL ejecutado − admin − iva (¿nos está alcanzando de verdad?)
 * admin/iva aquí son los mismos valores fijos calculados en calcularPresupuesto
 * (no se recalculan sobre el gasto real: son el costo administrativo y el IVA
 * de la cotización aprobada, tal como lo hace el Anexo 2).
 */
export function calcularControlCostos(items: CostoItem[], valorCotizado: number, admin: number, iva: number) {
  const plan = items.reduce((a, x) => a + Number(x.presupuestado || 0), 0);
  const real = items.reduce((a, x) => a + Number(x.real || 0), 0);
  const disponible = plan - real;
  const gananciaEst = valorCotizado - plan - admin - iva;
  const gananciaActual = valorCotizado - real - admin - iva;
  return { plan, real, disponible, gananciaEst, gananciaActual };
}

export type CotizacionInputs = {
  personas: number;
  valor_unit: number;
  horas: number;
  valor_hora: number;
};

export function calcularCotizacion(c: CotizacionInputs) {
  const personas = Number(c.personas || 0);
  const valorUnit = Number(c.valor_unit || 0);
  const horas = Number(c.horas || 0);
  const valorHora = Number(c.valor_hora || 0);

  const valMateriales = personas * valorUnit;
  const valorProf = horas * valorHora;
  const valorCotizado = valMateriales + valorProf;

  return { personas, valorUnit, valMateriales, horas, valorHora, valorProf, valorCotizado };
}

export const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

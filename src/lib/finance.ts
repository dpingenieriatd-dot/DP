// Motor financiero de D&P — fórmula alineada con el HTML de referencia V25
// (Panel_DP_Proyectos_V25_COLUMNAS_ADMIN_E_INVENTARIO.html, la versión más
// reciente que Angélica dio como fuente de verdad). Markup gross-up sobre
// precio de venta, no cost-plus simple: factor = (1+admin%)/(1-margen%).
// Con 15% admin / 30% margen: factor = 1.15/0.70 = 1.642857.
//
// (Versión anterior de esta fórmula —cost-plus simple, costos*margen/(1-margen)—
// quedó reemplazada 2026-08-19 al unificar con el HTML; daba cifras ~4%
// más bajas para los mismos costos/porcentajes.)

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

  const a = adminPct / 100;
  const u = margenPct / 100;
  const admin = costos * a;
  const factor = u >= 0.999 ? 1 + a : (1 + a) / (1 - u);
  const valor = costos * factor; // valor comercial antes de IVA
  const utilidadEsperada = Math.max(0, valor - costos - admin);
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

/**
 * Motor de ítems de cotización — igual al del HTML de referencia (dpQuoteCalc):
 * cada ítem tiene un costo interno unitario (tomado del catálogo al agregarlo);
 * el precio cliente unitario es costo × factor, salvo que se haya editado a mano
 * (precio_cliente_override). valor_cotizado real = suma de subtotales cliente + IVA.
 */
export type ItemCotizacion = {
  cantidad: number;
  costo_unitario: number;
  precio_cliente_override: number | null;
};

export function calcularCotizacionItems(
  items: ItemCotizacion[],
  opts: { admin_pct: number; margen_pct: number; resp_iva: boolean; iva_pct: number }
) {
  const a = Number(opts.admin_pct ?? 15) / 100;
  const u = Number(opts.margen_pct ?? 30) / 100;
  const ivaFrac = Number(opts.iva_pct ?? 19) / 100;
  const factor = u >= 0.999 ? 1 + a : (1 + a) / (1 - u);

  const direct = items.reduce((s, i) => s + Number(i.cantidad || 0) * Number(i.costo_unitario || 0), 0);
  const admin = direct * a;
  const base = direct * factor;
  const utilidad = Math.max(0, base - direct - admin);
  const aplicaIva = !!opts.resp_iva;
  const iva = aplicaIva ? base * ivaFrac : 0;
  const sugerido = base + iva;

  const itemsCalculados = items.map((i) => {
    const cantidad = Number(i.cantidad || 0);
    const autoUnitClient = Number(i.costo_unitario || 0) * factor;
    const override = i.precio_cliente_override;
    const unitClient = override != null && override > 0 ? Number(override) : autoUnitClient;
    return { ...i, autoUnitClient, unitClient, subtotalCliente: unitClient * cantidad };
  });
  const clientSubtotal = itemsCalculados.reduce((s, i) => s + i.subtotalCliente, 0);
  const clientIva = aplicaIva ? clientSubtotal * ivaFrac : 0;
  const clientTotal = clientSubtotal + clientIva;

  return { direct, admin, utilidad, base, iva, sugerido, itemsCalculados, clientSubtotal, clientIva, clientTotal, factor, aplicaIva };
}

export type ContratoInputs = {
  contrato_valor: number;
  contrato_incluye_iva: boolean;
  iva_aplica: boolean;
  iva_pct: number;
  retencion_pct: number;
  ica_pct: number;
  otras_retenciones: number;
};

/**
 * Efectivo neto esperado a nivel de contrato de un proyecto (distinto del
 * motor de rentabilidad de Cotizaciones/Presupuestos, que compara costo vs.
 * precio). Aquí se parte del valor pactado con el cliente y se calcula
 * cuánto llega realmente a D&P después de IVA, retención en la fuente e
 * ICA — que el cliente retiene y paga directamente a la DIAN/municipio,
 * no a D&P.
 *
 * Retención en la fuente e ICA se calculan sobre la base SIN IVA (estándar
 * en Colombia: esos impuestos no se calculan sobre el IVA mismo).
 */
export function calcularEfectivoEsperado(p: ContratoInputs) {
  const contratoValor = Number(p.contrato_valor || 0);
  const ivaPct = Number(p.iva_pct ?? 19);
  const retencionPct = Number(p.retencion_pct || 0);
  const icaPct = Number(p.ica_pct || 0);
  const otrasRetenciones = Number(p.otras_retenciones || 0);

  const valorSinIva = p.iva_aplica && p.contrato_incluye_iva ? contratoValor / (1 + ivaPct / 100) : contratoValor;
  const iva = p.iva_aplica ? valorSinIva * (ivaPct / 100) : 0;
  const valorConIva = valorSinIva + iva;

  const retencion = valorSinIva * (retencionPct / 100);
  const ica = valorSinIva * (icaPct / 100);

  const efectivoNetoEsperado = valorConIva - retencion - ica - otrasRetenciones;

  return { valorSinIva, iva, valorConIva, retencion, ica, otrasRetenciones, efectivoNetoEsperado };
}

export const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

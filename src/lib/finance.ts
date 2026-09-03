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
  /** IVA efectivo de la cotización aprobada (con IVA por ítem). Si viene, se
   *  usa tal cual en vez de estimar iva_pct% sobre todo el valor. */
  iva_monto?: number | null;
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
  const valor = costos * factor; // valor comercial "a tarifa" (referencia interna)
  const utilidadEsperada = Math.max(0, valor - costos - admin); // utilidad "a tarifa"
  // IVA: el efectivo de la cotización (IVA por ítem) si se propagó; si no,
  // estimación clásica de iva_pct% sobre todo el valor cuando responde IVA.
  const iva = p.iva_monto != null ? Number(p.iva_monto) : p.resp_iva ? valor * (ivaPct / 100) : 0;

  const valorCotizado = Number(p.valor_cotizado || 0);
  // Utilidad y margen REALES de esta oferta: sobre lo que efectivamente se
  // cotizó (no la reconstrucción "a tarifa"). Pueden ser < objetivo o
  // negativos. `utilidadOferta` es también el criterio de viabilidad:
  // viable = la cotización cubre costo directo + admin (+ IVA) → no da pérdida.
  const utilidadOferta = valorCotizado - costos - admin - iva;
  const margenOferta = valorCotizado > 0 ? utilidadOferta / valorCotizado : 0;
  const margenNeg = utilidadOferta; // alias histórico
  const viable = utilidadOferta >= 0;

  return { costos, admin, utilidadEsperada, utilidadOferta, margenOferta, valor, iva, valorCotizado, margenNeg, viable };
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
export function calcularControlCostos(items: CostoItem[], valorCotizado: number, admin: number, iva: number, realOverride?: number) {
  const plan = items.reduce((a, x) => a + Number(x.presupuestado || 0), 0);
  // El costo real sale de las compras del proyecto cuando se pasa realOverride;
  // el `real` manual de cada línea solo se usa donde no hay compras conectadas.
  const real = realOverride !== undefined ? realOverride : items.reduce((a, x) => a + Number(x.real || 0), 0);
  const disponible = plan - real;
  const gananciaEst = valorCotizado - plan - admin - iva;
  const gananciaActual = valorCotizado - real - admin - iva;
  return { plan, real, disponible, gananciaEst, gananciaActual };
}

/**
 * Motor de ítems de cotización — igual al del HTML de referencia (dpQuoteCalc):
 * cada ítem tiene un costo interno unitario (tomado del catálogo al agregarlo);
 * el precio cliente unitario es costo × factor ("Auto"), salvo que se haya
 * editado a mano ("Manual", precio_cliente_override). El valor cotizado real
 * (clientTotal) = suma de subtotales cliente + IVA — sale de los precios reales
 * de la tabla, NO del factor. Por eso admin%/margen% solo mueven el total a
 * través de los ítems en Auto; los ítems en Manual quedan como los fijó el
 * usuario. `utilidadReal`/`margenReal` reflejan la oferta tal cual quedó
 * (pueden ser < objetivo o negativas); `base`/`utilidad` son las cifras
 * "a tarifa" derivadas solo del factor.
 */
export type ItemCotizacion = {
  cantidad: number;
  costo_unitario: number;
  precio_cliente_override: number | null;
  /** Si el ítem es gravado con IVA. Default true (ausente = true) para
   *  compatibilidad con ítems viejos. Solo cuenta si la cotización responde IVA. */
  lleva_iva?: boolean;
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

  const itemsCalculados = items.map((i) => {
    const cantidad = Number(i.cantidad || 0);
    const autoUnitClient = Number(i.costo_unitario || 0) * factor;
    const override = i.precio_cliente_override;
    const unitClient = override != null && override > 0 ? Number(override) : autoUnitClient;
    const llevaIva = i.lleva_iva !== false; // ausente = true
    return { ...i, autoUnitClient, unitClient, llevaIva, subtotalCliente: unitClient * cantidad };
  });
  const clientSubtotal = itemsCalculados.reduce((s, i) => s + i.subtotalCliente, 0);
  // IVA solo sobre los ítems gravados, y solo si la cotización responde IVA.
  const baseGravada = aplicaIva ? itemsCalculados.filter((i) => i.llevaIva).reduce((s, i) => s + i.subtotalCliente, 0) : 0;
  const clientIva = baseGravada * ivaFrac;
  const clientTotal = clientSubtotal + clientIva;

  // Utilidad/margen REALES de la oferta: sobre el precio que efectivamente se
  // cobra (clientSubtotal), no sobre el "a tarifa" (base). direct + admin +
  // utilidadReal = clientSubtotal siempre, así el desglose cuadra en pantalla.
  const utilidadReal = clientSubtotal - direct - admin;
  const margenReal = clientSubtotal > 0 ? utilidadReal / clientSubtotal : 0;

  return { direct, admin, utilidad, utilidadReal, margenReal, base, itemsCalculados, clientSubtotal, baseGravada, clientIva, clientTotal, factor, aplicaIva };
}

export type EfectivoInputs = {
  /** Valor cotizado al cliente, IVA incluido (cotizaciones.valor_cotizado). */
  valorConIva: number;
  /** IVA efectivo embebido en el valor cotizado (cotizaciones.iva_monto). */
  iva: number;
  /** Perfil tributario del cliente. */
  retencionFuentePct: number; // porcentaje (ej. 11)
  icaPorMil: number; // tarifa POR MIL (ej. 9,66), no porcentaje
  /** Retenciones fijas adicionales de esta cotización, en $. */
  otrasRetenciones: number;
};

/**
 * Efectivo neto esperado: cuánto le llega realmente a D&P después de lo que el
 * cliente retiene y paga directamente a la DIAN/municipio (retención en la
 * fuente, ICA, otras). Es distinto del motor de rentabilidad, que compara
 * costo vs. precio — aquí se parte del valor cotizado.
 *
 * Retención en la fuente e ICA se calculan sobre la base SIN IVA (estándar en
 * Colombia). La retención en la fuente es un PORCENTAJE (11 % honorarios →
 * /100); el ICA es una TARIFA POR MIL (Bogotá servicios 9,66 x 1.000 → /1000),
 * como lo cobran los municipios. Ambas tarifas vienen del perfil del cliente.
 */
export function calcularEfectivoEsperado(p: EfectivoInputs) {
  const valorConIva = Number(p.valorConIva || 0);
  const iva = Number(p.iva || 0);
  const otrasRetenciones = Number(p.otrasRetenciones || 0);

  const valorSinIva = valorConIva - iva;
  const retencion = valorSinIva * (Number(p.retencionFuentePct || 0) / 100);
  const ica = valorSinIva * (Number(p.icaPorMil || 0) / 1000);

  const efectivoNetoEsperado = valorConIva - retencion - ica - otrasRetenciones;

  return { valorSinIva, iva, valorConIva, retencion, ica, otrasRetenciones, efectivoNetoEsperado };
}

export const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// Estado consolidado de un proyecto — junta cotización aprobada (valor),
// presupuesto (plan de costos) y compras (gasto real) en un solo cálculo.
// El gasto real ya NO se captura a mano: sale de las compras registradas
// contra el proyecto. Lo usa el tablero "Control de proyectos" del Inicio de
// Gestión y las listas/detalles de Proyectos.
// ---------------------------------------------------------------------------

export type CompraProyecto = {
  cantidad: number | string | null;
  valor_unitario: number | string | null;
  estado_pago?: string | null;
  archivado?: boolean | null;
};

export type EstadoPlata = "sano" | "riesgo" | "critico";

const nz = (v: unknown) => Number(v || 0);

/** Costo base del presupuesto: suma de lo presupuestado en las líneas del control
 *  de costos; si aún no hay líneas (presupuestos históricos migrados) se usa el
 *  costo directo guardado en el registro. */
export function costoBasePresupuesto(
  registro: { costos: number | string | null },
  lineas: { presupuestado: number | string | null }[],
) {
  if (lineas.length) return lineas.reduce((s, c) => s + nz(c.presupuestado), 0);
  return nz(registro.costos);
}

export function calcularEstadoProyecto(p: {
  valorAprobado: number;
  planCosto: number;
  /** Costo administrativo e IVA ABSOLUTOS del/los presupuesto(s) del proyecto,
   *  ya calculados con `calcularPresupuesto` por quien llama. Así el tablero
   *  usa exactamente las mismas cifras que la ficha del presupuesto y respeta
   *  el `iva_monto` de la cotización (antes reestimaba 19 % sobre el plan). */
  admin: number;
  iva: number;
  compras: CompraProyecto[];
  umbralRiesgoPct?: number;
}) {
  const activas = p.compras.filter((c) => !c.archivado);
  const comprometido = activas.reduce((s, c) => s + nz(c.cantidad) * nz(c.valor_unitario), 0);
  const pagado = activas
    .filter((c) => c.estado_pago === "Pagado")
    .reduce((s, c) => s + nz(c.cantidad) * nz(c.valor_unitario), 0);

  const admin = nz(p.admin);
  const iva = nz(p.iva);

  const sinValorAprobado = p.valorAprobado <= 0;
  const gananciaProyectada = p.valorAprobado - p.planCosto - admin - iva;
  const gananciaReal = p.valorAprobado - comprometido - admin - iva;
  const disponible = p.planCosto - comprometido;
  const ejecutadoPct = p.planCosto > 0 ? (comprometido / p.planCosto) * 100 : 0;

  const umbral = p.umbralRiesgoPct ?? 80;
  // >1 peso por encima del plan (evita falsos rojos por redondeo cuando el
  // gasto calza exacto con lo presupuestado).
  const sobregirado = p.planCosto > 0 && comprometido - p.planCosto > 1;
  let semaforo: EstadoPlata;
  if (sobregirado || (!sinValorAprobado && gananciaReal < 0)) semaforo = "critico";
  else if (p.planCosto > 0 && ejecutadoPct >= umbral) semaforo = "riesgo";
  else semaforo = "sano";

  return { comprometido, pagado, admin, iva, gananciaProyectada, gananciaReal, disponible, ejecutadoPct, semaforo, sinValorAprobado };
}

export type EstadoTiempo = "a_tiempo" | "por_vencer" | "atrasado" | "sin_fecha" | "cerrado";

/** Semáforo de cronograma a partir de la fecha de entrega del proyecto.
 *  v1: solo fechas de inicio/fin del proyecto (los hitos vienen después).
 *  "A tiempo" significa literalmente "no ha pasado la fecha de entrega" — el
 *  avance real vs. tiempo transcurrido es otra dimensión (viene de Seguimiento). */
export function calcularCronograma(
  fechaFin: string | null | undefined,
  estado: string,
  opts: { hoy?: Date; diasAviso?: number } = {},
): { estado: EstadoTiempo; dias: number | null } {
  if (estado === "Finalizado" || estado === "Cancelado" || estado === "Rechazado") {
    return { estado: "cerrado", dias: null };
  }
  if (!fechaFin) return { estado: "sin_fecha", dias: null };
  const hoy = opts.hoy ?? new Date();
  const diasAviso = opts.diasAviso ?? 15;
  const fin = new Date(fechaFin + "T00:00:00");
  const dias = Math.round((fin.getTime() - new Date(hoy.toISOString().slice(0, 10) + "T00:00:00").getTime()) / 86_400_000);
  if (dias < 0) return { estado: "atrasado", dias };
  if (dias <= diasAviso) return { estado: "por_vencer", dias };
  return { estado: "a_tiempo", dias };
}

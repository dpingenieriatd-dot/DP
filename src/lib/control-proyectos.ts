import {
  calcularEstadoProyecto,
  calcularCronograma,
  costoBasePresupuesto,
  type EstadoPlata,
  type EstadoTiempo,
} from "@/lib/finance";

export type FilaControl = {
  id: string;
  codigo: string | null;
  nombre: string;
  cliente: string;
  clienteId: string | null;
  estado: string;
  valorAprobado: number;
  plan: number;
  comprometido: number;
  pagado: number;
  disponible: number;
  gananciaProyectada: number;
  gananciaReal: number;
  ejecutadoPct: number;
  semaforoPlata: EstadoPlata;
  sinValorAprobado: boolean;
  tiempo: EstadoTiempo;
  diasTiempo: number | null;
};

/** Proyectos "en curso" — los únicos que aparecen en el Control de proyectos. */
export const EN_CURSO = new Set(["Planeado", "En ejecución", "En ejecucion", "Suspendido"]);

type ProyectoInput = {
  id: string;
  codigo: string | null;
  nombre: string;
  cliente_id: string | null;
  estado: string;
  fecha_fin: string | null;
};
type PresupuestoInput = {
  id: string;
  proyecto_id: string | null;
  costos: number | string | null;
  valor_cotizado: number | string | null;
  admin_pct: number | string | null;
  margen_pct: number | string | null;
  resp_iva: boolean | null;
  iva_pct: number | string | null;
};
type CostoInput = { presupuesto_id: string; presupuestado: number | string | null };
type CompraInput = {
  proyecto_id: string | null;
  cantidad: number | string | null;
  valor_unitario: number | string | null;
  estado_pago?: string | null;
  archivado?: boolean | null;
};
type SettingsInput = {
  admin_pct?: number | string | null;
  margin_pct?: number | string | null;
  iva_pct?: number | string | null;
  umbral_ejecucion_pct?: number | string | null;
} | null;

export function construirFilasControl(input: {
  proyectos: ProyectoInput[];
  presupuestos: PresupuestoInput[];
  costos: CostoInput[];
  compras: CompraInput[];
  settings: SettingsInput;
  nombreCliente: (id: string | null) => string;
}): FilaControl[] {
  const umbralRiesgoPct = Number(input.settings?.umbral_ejecucion_pct ?? 80);

  const rank = (r: FilaControl) =>
    r.semaforoPlata === "critico" ? 0 : r.tiempo === "atrasado" ? 1 : r.semaforoPlata === "riesgo" ? 2 : 3;

  // Calcula una fila por cada proyecto recibido; el filtro "en curso" lo aplica
  // quien consume (el tablero) — así el resto de la página puede reutilizar el
  // estado de proyectos ya cerrados.
  return input.proyectos
    .map((p) => {
      const pres = input.presupuestos.filter((x) => x.proyecto_id === p.id);
      const ref = pres[0];
      const planCosto = pres.reduce(
        (s, x) => s + costoBasePresupuesto(x, input.costos.filter((c) => c.presupuesto_id === x.id)),
        0,
      );
      const e = calcularEstadoProyecto({
        valorAprobado: pres.reduce((s, x) => s + Number(x.valor_cotizado || 0), 0),
        planCosto,
        adminPct: Number(ref?.admin_pct ?? input.settings?.admin_pct ?? 15),
        margenPct: Number(ref?.margen_pct ?? input.settings?.margin_pct ?? 30),
        respIva: ref?.resp_iva ?? true,
        ivaPct: Number(ref?.iva_pct ?? input.settings?.iva_pct ?? 19),
        compras: input.compras.filter((c) => c.proyecto_id === p.id),
        umbralRiesgoPct,
      });
      const crono = calcularCronograma(p.fecha_fin, p.estado);
      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        cliente: input.nombreCliente(p.cliente_id),
        clienteId: p.cliente_id,
        estado: p.estado,
        valorAprobado: pres.reduce((s, x) => s + Number(x.valor_cotizado || 0), 0),
        plan: planCosto,
        comprometido: e.comprometido,
        pagado: e.pagado,
        disponible: e.disponible,
        gananciaProyectada: e.gananciaProyectada,
        gananciaReal: e.gananciaReal,
        ejecutadoPct: e.ejecutadoPct,
        semaforoPlata: e.semaforo,
        sinValorAprobado: e.sinValorAprobado,
        tiempo: crono.estado,
        diasTiempo: crono.dias,
      };
    })
    .sort((a, b) => rank(a) - rank(b) || (a.codigo ?? "").localeCompare(b.codigo ?? ""));
}

export function resumenControl(filas: FilaControl[]) {
  const conValor = filas.filter((r) => !r.sinValorAprobado);
  return {
    activos: filas.length,
    enRiesgo: filas.filter((r) => r.semaforoPlata !== "sano").length,
    atrasados: filas.filter((r) => r.tiempo === "atrasado").length,
    gananciaProyectada: conValor.reduce((s, r) => s + r.gananciaProyectada, 0),
    gananciaReal: conValor.reduce((s, r) => s + r.gananciaReal, 0),
    comprometido: filas.reduce((s, r) => s + r.comprometido, 0),
  };
}

export function etiquetaPlata(s: EstadoPlata): string {
  return s === "sano" ? "En presupuesto" : s === "riesgo" ? "En atención" : "Sobre presupuesto";
}

export function etiquetaTiempo(t: EstadoTiempo, dias: number | null): string {
  switch (t) {
    case "a_tiempo":
      return "A tiempo";
    case "por_vencer":
      return `Vence en ${dias} d`;
    case "atrasado":
      return `Atrasado ${Math.abs(dias ?? 0)} d`;
    case "cerrado":
      return "Cerrado";
    default:
      return "Sin fecha";
  }
}

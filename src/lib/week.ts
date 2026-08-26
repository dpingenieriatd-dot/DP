/**
 * Lunes a domingo de la semana de `ref` (por defecto, hoy). Incluye
 * sábado y domingo para poder registrar días extraordinarios que salen
 * del horario habitual — no se espera que se usen de forma regular.
 */
export function semanaActual(ref: Date = new Date()) {
  const dia = ref.getDay(); // 0=domingo … 6=sábado
  const offsetLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(ref);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() + offsetLunes);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** dd/mm/yyyy, igual a formatDate() del HTML de referencia. */
export function formatDateDMY(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** "lun 26/08", igual a shortDay() del HTML de referencia. */
export function shortDay(d: Date) {
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(/\./g, "");
}

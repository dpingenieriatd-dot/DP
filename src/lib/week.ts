/** Lunes a viernes de la semana de `ref` (por defecto, hoy). */
export function semanaActual(ref: Date = new Date()) {
  const dia = ref.getDay(); // 0=domingo … 6=sábado
  const offsetLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(ref);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() + offsetLunes);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

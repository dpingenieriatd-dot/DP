// "Actividades" (Seguimiento) no es una tabla propia en el HTML de referencia: es un
// historial derivado de las mismas tareas de Banco de tareas — cualquier tarea con
// responsable (interno o externo), terminada, o registrada manualmente con
// origen "Actividad manual". Esta misma regla la usan Inicio (donas) y Actividades.
export type TareaParaActividad = {
  estado: string;
  responsable: string | null;
  responsable_externo_id: string | null;
  origen: string;
};

export function esActividad(t: TareaParaActividad) {
  return !!t.responsable || !!t.responsable_externo_id || t.estado === "Terminada" || t.origen === "Actividad manual";
}

export type ResultadoActividad = "Cumplida" | "Pendiente/Parcial" | "No cumplida";

export function resultadoActividad(t: { estado: string }): ResultadoActividad {
  if (t.estado === "Terminada") return "Cumplida";
  // El HTML distingue "No cumplida" para tareas bloqueadas — la app no modela ese estado,
  // así que todo lo abierto cae en Pendiente/Parcial (nunca hay falsos "No cumplida").
  return "Pendiente/Parcial";
}

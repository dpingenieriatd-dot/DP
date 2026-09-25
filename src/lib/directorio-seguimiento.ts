import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Datos de referencia que el módulo Seguimiento necesita pero que viven en
 * tablas protegidas por RLS: clientes/proyectos/empresas/profesionales son
 * "solo módulo gestion" y profiles es "la propia fila o admin". Un usuario
 * con solo Seguimiento las leía vacías (listas del formulario sin opciones,
 * tarjetas sin cliente/proyecto/responsable).
 *
 * En vez de abrir esas tablas por RLS -- lo que expondría por API directa el
 * valor del contrato, márgenes, retenciones, etc. -- el servidor lee con la
 * service_role SOLO las columnas de identificación, y solo si quien llama
 * tiene el módulo Seguimiento (mismo has_module() que usa el RLS).
 * Nunca importar desde un componente "use client".
 */
export type DirectorioSeguimiento = {
  clientes: { id: string; nombre: string }[];
  /** Todos (incl. archivados/rechazados) -- para resolver nombres de tareas viejas. */
  proyectos: { id: string; codigo: string | null; nombre: string; archivado: boolean; estado: string }[];
  /** Mismo criterio que Gestión > Proyectos por defecto: sin archivados ni rechazados, para publicar tareas. */
  proyectosActivos: { id: string; codigo: string | null; nombre: string }[];
  empresas: { id: string; nombre: string; cliente_id: string | null }[];
  profesionales: {
    id: string;
    nombre: string;
    perfil: string | null;
    especialidad: string | null;
    ciudad: string | null;
    correo: string | null;
    telefono: string | null;
    estado: string | null;
  }[];
  profesionalesActivos: DirectorioSeguimiento["profesionales"];
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    cargo: string | null;
    capacidad_semanal_horas: number;
    activo: boolean;
  }[];
  /** Cronómetros abiertos de cualquier persona (registros_tiempo es "solo los propios" por RLS). */
  registrosAbiertos: { id: string; tarea_id: string; inicio: string }[];
};

const VACIO: DirectorioSeguimiento = {
  clientes: [],
  proyectos: [],
  proyectosActivos: [],
  empresas: [],
  profesionales: [],
  profesionalesActivos: [],
  profiles: [],
  registrosAbiertos: [],
};

export async function tieneModuloSeguimiento() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_module", { mod: "seguimiento" });
  return data === true;
}

export const getDirectorioSeguimiento = cache(async (): Promise<DirectorioSeguimiento> => {
  if (!(await tieneModuloSeguimiento())) return VACIO;

  const admin = createAdminClient();
  const [
    { data: clientes },
    { data: proyectos },
    { data: empresas },
    { data: profesionales },
    { data: profiles },
    { data: registrosAbiertos },
  ] = await Promise.all([
    admin.from("clientes").select("id, nombre").order("nombre"),
    admin.from("proyectos").select("id, codigo, nombre, archivado, estado").order("nombre"),
    admin.from("empresas_atendidas").select("id, nombre, cliente_id").order("nombre"),
    admin.from("profesionales").select("id, nombre, perfil, especialidad, ciudad, correo, telefono, estado").order("nombre"),
    admin.from("profiles").select("id, full_name, email, cargo, capacidad_semanal_horas, activo").order("full_name"),
    admin.from("registros_tiempo").select("id, tarea_id, inicio").is("fin", null),
  ]);

  const todosProyectos = proyectos ?? [];
  const todosProfesionales = profesionales ?? [];
  return {
    clientes: clientes ?? [],
    proyectos: todosProyectos,
    proyectosActivos: todosProyectos
      .filter((p) => !p.archivado && p.estado !== "Rechazado")
      .map(({ id, codigo, nombre }) => ({ id, codigo, nombre })),
    empresas: empresas ?? [],
    profesionales: todosProfesionales,
    profesionalesActivos: todosProfesionales.filter((p) => p.estado === "Activo"),
    profiles: profiles ?? [],
    registrosAbiertos: registrosAbiertos ?? [],
  };
});

/**
 * Reemplaza los embebidos `clientes(nombre), proyectos(nombre)` de PostgREST,
 * que vuelven null cuando el RLS no deja leer la tabla referenciada.
 */
export function conNombres<T extends { cliente_id?: string | null; proyecto_id?: string | null }>(
  filas: T[],
  dir: Pick<DirectorioSeguimiento, "clientes" | "proyectos">,
): (T & { clientes: { nombre: string } | null; proyectos: { nombre: string } | null })[] {
  const clientes = new Map(dir.clientes.map((c) => [c.id, c.nombre]));
  const proyectos = new Map(dir.proyectos.map((p) => [p.id, p.nombre]));
  return filas.map((f) => {
    const cliente = f.cliente_id ? clientes.get(f.cliente_id) : undefined;
    const proyecto = f.proyecto_id ? proyectos.get(f.proyecto_id) : undefined;
    return {
      ...f,
      clientes: cliente ? { nombre: cliente } : null,
      proyectos: proyecto ? { nombre: proyecto } : null,
    };
  });
}

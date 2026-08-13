import { createClient } from "@/lib/supabase/server";
import { CustomReportForm } from "./custom-form";

const REPORTES = [
  { slug: "resumen", titulo: "Resumen ejecutivo", descripcion: "KPIs generales de Seguimiento y Gestión." },
  { slug: "proyectos", titulo: "Proyectos", descripcion: "Listado de proyectos con ganancia estimada por proyecto." },
  { slug: "presupuestos", titulo: "Presupuestos", descripcion: "Costos, utilidad esperada, IVA y viabilidad por presupuesto." },
  { slug: "cotizaciones", titulo: "Cotizaciones", descripcion: "Histórico de cotizaciones enviadas a clientes." },
  { slug: "compras", titulo: "Compras", descripcion: "Control de compras por proyecto, proveedor y estado de pago." },
  { slug: "clientes", titulo: "Clientes", descripcion: "Cartera de clientes de D&P." },
  { slug: "proveedores", titulo: "Proveedores", descripcion: "Directorio de proveedores." },
  { slug: "insumos", titulo: "Banco de insumos", descripcion: "Catálogo de insumos con costo unitario." },
  { slug: "tareas", titulo: "Banco de tareas", descripcion: "Estado del banco de tareas del equipo." },
  { slug: "actividades", titulo: "Actividades", descripcion: "Registro histórico de actividades del equipo." },
];

export default async function ReportesPage() {
  const supabase = await createClient();
  const { data: proyectos } = await supabase.from("proyectos").select("id, codigo, nombre").order("nombre");

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Reportes</h1>
      <p className="mt-1 text-sm text-neutral-500">Descarga reportes en PDF listos para compartir.</p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {REPORTES.map((r) => (
          <div key={r.slug} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4">
            <div>
              <div className="font-semibold text-emerald-900">{r.titulo}</div>
              <div className="mt-1 text-xs text-neutral-500">{r.descripcion}</div>
            </div>
            <a
              href={`/api/reportes/${r.slug}`}
              className="ml-4 shrink-0 rounded-md bg-emerald-900 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Descargar PDF
            </a>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase text-neutral-500">Reportes personalizados</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Filtrá compras o presupuestos por un proyecto específico — el PDF sale con el listado y el total de ese
        proyecto solamente.
      </p>
      <div className="mt-2">
        <CustomReportForm proyectos={proyectos ?? []} />
      </div>
    </div>
  );
}

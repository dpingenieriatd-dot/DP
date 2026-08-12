import { getDashboardData } from "@/lib/dashboard-data";
import { money } from "@/lib/finance";
import { PieCard, BarCard } from "@/components/charts";

export default async function HomePage() {
  const d = await getDashboardData();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Inicio</h1>
      <p className="mt-1 text-sm text-neutral-500">Resumen general de Seguimiento y Gestión.</p>

      <h2 className="mt-6 text-sm font-semibold uppercase text-neutral-500">Seguimiento</h2>
      <div className="mt-2 grid grid-cols-3 gap-4">
        <Kpi label="Tareas disponibles" valor={d.disponibles} />
        <Kpi label="En proceso" valor={d.enProceso} />
        <Kpi label="Terminadas" valor={d.terminadas} />
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase text-neutral-500">Gestión</h2>
      <div className="mt-2 grid grid-cols-4 gap-4">
        <Kpi label="Proyectos activos" valor={d.proyectosActivos} />
        <Kpi label="Clientes" valor={d.clientes} />
        <Kpi label="Valor cotizado total" valor={money.format(d.ingresos)} />
        <Kpi label="Ganancia estimada total" valor={money.format(d.gananciaEstTotal)} />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {d.viables} de {d.totalPresupuestos} presupuestos son viables (valor cotizado ≥ valor sugerido).
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase text-neutral-500">Gráficos</h2>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <PieCard
          title="Tareas por estado"
          data={[
            { name: "Disponible", value: d.disponibles },
            { name: "En proceso", value: d.enProceso },
            { name: "Terminada", value: d.terminadas },
          ]}
        />
        <PieCard
          title="Viabilidad de presupuestos"
          data={[
            { name: "Viable", value: d.viables },
            { name: "No viable", value: d.totalPresupuestos - d.viables },
          ]}
        />
      </div>
      <div className="mt-4">
        <BarCard title="Ingresos por proyecto (top 6)" data={d.topProyectos} format="money" />
      </div>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-emerald-900">{valor}</div>
    </div>
  );
}

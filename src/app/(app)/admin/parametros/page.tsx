import { createClient } from "@/lib/supabase/server";
import { ParametrosForm } from "./form";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  if (miPerfil?.role !== "admin") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-emerald-900">Parámetros</h1>
        <p className="mt-2 text-sm text-neutral-500">Solo un administrador puede ver y editar esta sección.</p>
      </div>
    );
  }

  const [{ data: settings }, { data: efectividad }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("efectividad_parametros").select("*").eq("id", 1).single(),
  ]);

  return <ParametrosForm settings={settings} efectividad={efectividad} />;
}

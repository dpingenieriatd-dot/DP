import { createClient } from "@/lib/supabase/server";
import { TemaPicker } from "./picker";

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
        <h1 className="text-2xl font-semibold text-emerald-900">Temas</h1>
        <p className="mt-2 text-sm text-neutral-500">Solo un administrador puede ver y cambiar el tema de la plataforma.</p>
      </div>
    );
  }

  const { data: config } = await supabase.from("app_config").select("tema").eq("id", 1).maybeSingle();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-emerald-900">Temas</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Elegí la paleta de colores de toda la plataforma. El cambio aplica para todo el equipo, no solo para vos.
      </p>
      <div className="mt-6">
        <TemaPicker temaActual={config?.tema ?? "verde"} />
      </div>
    </div>
  );
}

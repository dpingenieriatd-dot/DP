import { createClient } from "@/lib/supabase/server";
import { SoporteForm, type Ticket } from "./soporte-form";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: miPerfil } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };

  if (miPerfil?.role !== "admin") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-emerald-900">Soporte técnico</h1>
        <p className="mt-2 text-sm text-neutral-500">Solo un administrador puede ver y editar esta sección.</p>
      </div>
    );
  }

  const { data: tickets } = await supabase
    .from("soporte_tickets")
    .select("id, titulo, descripcion, urgencia, estado, pagina, respuesta, creado_en, profiles(full_name, email)")
    .order("creado_en", { ascending: false });

  return <SoporteForm tickets={(tickets ?? []) as unknown as Ticket[]} />;
}

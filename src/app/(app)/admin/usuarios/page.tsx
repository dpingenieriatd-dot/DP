import { createClient } from "@/lib/supabase/server";
import { UsuariosList } from "./list";

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
        <h1 className="text-2xl font-semibold text-emerald-900">Usuarios</h1>
        <p className="mt-2 text-sm text-neutral-500">Solo un administrador puede ver y gestionar esta sección.</p>
      </div>
    );
  }

  const { data: perfiles } = await supabase.from("profiles").select("*").order("created_at");

  return <UsuariosList perfiles={perfiles ?? []} currentUserId={user!.id} />;
}

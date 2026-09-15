import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // ¿Ya aceptó la invitación (puso contraseña y confirmó el correo) o sigue
  // pendiente? profiles no lo sabe -- esto vive en auth.users, solo visible
  // con la service_role key. Si el listado admin falla por lo que sea, no se
  // bloquea la página entera: todos quedan como "no pendiente" (peor caso,
  // no se muestra el aviso, pero la lista de usuarios sigue funcionando).
  let pendientes = new Set<string>();
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
    pendientes = new Set((data?.users ?? []).filter((u) => !u.email_confirmed_at).map((u) => u.id));
  } catch {
    // sin SUPABASE_SERVICE_ROLE_KEY en este entorno: se omite el aviso de pendientes.
  }

  const perfilesConEstado = (perfiles ?? []).map((p) => ({ ...p, pendiente: pendientes.has(p.id) }));

  return <UsuariosList perfiles={perfilesConEstado} currentUserId={user!.id} />;
}

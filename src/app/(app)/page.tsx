import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Inicio se separó en uno por sección (Seguimiento/Gestión), como en los HTML de referencia — esta ruta solo decide a cuál mandar. */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let modules: string[] = [];
  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from("profiles").select("modules, role").eq("id", user.id).single();
    modules = data?.modules ?? [];
    isAdmin = data?.role === "admin";
  }

  if (isAdmin || modules.includes("seguimiento")) redirect("/seguimiento");
  if (modules.includes("gestion")) redirect("/gestion");
  redirect("/login");
}

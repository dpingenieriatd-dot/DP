import { createClient } from "@/lib/supabase/server";

export async function getCurrentProfileLabel() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("full_name, cargo, role").eq("id", user.id).single();
  if (!data) return user.email ?? null;

  const nombre = data.full_name || user.email || "Usuario";
  const cargo = data.role === "admin" ? "Administrador" : data.cargo || "";
  return cargo ? `${nombre} · ${cargo}` : nombre;
}

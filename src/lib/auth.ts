import { createClient } from "@/lib/supabase/server";

/** Confirma que quien llama a la action ya es admin — la página lo filtra, pero una Server Action se puede invocar directo. */
export async function requiereAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: miPerfil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  return miPerfil?.role === "admin";
}

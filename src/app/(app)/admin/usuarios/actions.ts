"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Confirma que quien llama a la action ya es admin — la página lo filtra, pero una Server Action se puede invocar directo. */
async function requiereAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: miPerfil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  return miPerfil?.role === "admin";
}

export async function invitarUsuario(formData: FormData) {
  if (!(await requiereAdmin())) return { error: "Solo un administrador puede invitar usuarios." };

  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "El correo es obligatorio." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo preparar la invitación." };
  }

  const { data: invitado, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError) return { error: inviteError.message };

  const modules = formData.getAll("modules") as string[];
  const { error: perfilError } = await admin
    .from("profiles")
    .update({
      full_name: formData.get("full_name") || null,
      cargo: formData.get("cargo") || null,
      role: formData.get("role") || "member",
      modules,
    })
    .eq("id", invitado.user!.id);
  if (perfilError) return { error: `Se envió la invitación, pero no se pudo guardar el perfil: ${perfilError.message}` };

  revalidatePath("/admin/usuarios");
}

export async function actualizarPerfil(id: string, formData: FormData) {
  const supabase = await createClient();
  const modules = formData.getAll("modules") as string[];

  const { error } = await supabase
    .from("profiles")
    .update({
      role: formData.get("role") || "member",
      modules,
      cargo: formData.get("cargo") || null,
      capacidad_semanal_horas: formData.get("capacidad_semanal_horas") || 40,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/usuarios");
}

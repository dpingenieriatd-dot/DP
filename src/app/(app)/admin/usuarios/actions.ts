"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requiereAdmin } from "@/lib/auth";

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

  // Sin redirectTo, Supabase manda el enlace al "Site URL" genérico del
  // proyecto en vez de /auth/callback -- la sesión (tokens) queda tirada ahí
  // sin procesar y la persona termina en el login en vez de en cambio de
  // contraseña. Mismo patrón que ya usa recuperar-password/page.tsx.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.dpingenieriaintegral.com";
  const { data: invitado, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/cuenta/password`,
  });
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

export async function desactivarUsuario(id: string) {
  if (!(await requiereAdmin())) return { error: "Solo un administrador puede desactivar usuarios." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === id) return { error: "No puedes desactivar tu propia cuenta." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo preparar la desactivación." };
  }

  // Revoca el acceso (no puede volver a iniciar sesión ni refrescar su sesión
  // actual) sin borrar la cuenta ni su historial -- "ban" en vez de "delete".
  const { error: banError } = await admin.auth.admin.updateUserById(id, { ban_duration: "87600h" });
  if (banError) return { error: banError.message };

  const { error } = await admin.from("profiles").update({ activo: false }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
}

export async function reactivarUsuario(id: string) {
  if (!(await requiereAdmin())) return { error: "Solo un administrador puede reactivar usuarios." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo preparar la reactivación." };
  }

  const { error: banError } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
  if (banError) return { error: banError.message };

  const { error } = await admin.from("profiles").update({ activo: true }).eq("id", id);
  if (error) return { error: error.message };

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

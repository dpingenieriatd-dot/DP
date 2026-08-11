import { createClient } from "@/lib/supabase/server";
import { TaskBoard } from "./board";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: tareas }, { data: profiles }, { data: timerActivo }] = await Promise.all([
    supabase.from("tareas").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email"),
    user
      ? supabase
          .from("registros_tiempo")
          .select("id, tarea_id, inicio")
          .eq("usuario_id", user.id)
          .is("fin", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <TaskBoard
      tareas={tareas ?? []}
      profiles={profiles ?? []}
      currentUserId={user?.id ?? null}
      timerActivo={timerActivo ?? null}
    />
  );
}

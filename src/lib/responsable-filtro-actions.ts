"use server";

import { cookies } from "next/headers";

const COOKIE = "sf_responsable";

export async function setResponsableFiltro(id: string) {
  const store = await cookies();
  if (id) store.set(COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  else store.delete(COOKIE);
}

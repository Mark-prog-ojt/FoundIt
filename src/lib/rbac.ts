import "server-only";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

type Role = "USER" | "STAFF" | "ADMIN";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.role)) redirect("/"); // or redirect("/login") if you prefer
  return session;
}

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";

export default async function FoundNewAliasPage() {
  await requireRole(["STAFF", "ADMIN"]);
  redirect("/staff/found/new");
}

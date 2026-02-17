import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";

export default async function AdminIndexPage() {
  await requireRole(["ADMIN"]);
  redirect("/admin/dashboard");
}

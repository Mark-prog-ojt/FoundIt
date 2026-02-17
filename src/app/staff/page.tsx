import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";

export default async function StaffIndexPage() {
  await requireRole(["STAFF", "ADMIN"]);
  redirect("/staff/dashboard");
}

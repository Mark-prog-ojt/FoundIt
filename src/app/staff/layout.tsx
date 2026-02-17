import type { ReactNode } from "react";
import { requireRole } from "@/lib/rbac";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  await requireRole(["STAFF", "ADMIN"]);
  return children;
}

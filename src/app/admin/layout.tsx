import type { ReactNode } from "react";
import { requireRole } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole(["ADMIN"]);
  return children;
}

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { AppShell } from "@/components/site/app-shell";
import { ProfileView } from "@/components/profile/profile-view";

export default async function ProfilePage() {
  const session = await requireSession();

  const user = await prisma.user.findUnique({
    where: { user_id: session.userId },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      id_number: true,
      department: true,
      status: true,
      date_registered: true,
      role: { select: { role_name: true } },
      avatar_url: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <AppShell>
      <ProfileView
        initialUser={{
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          id_number: user.id_number,
          department: user.department,
          status: user.status,
          date_registered: String(user.date_registered),
          role: user.role.role_name,
          avatar_url: user.avatar_url,
        }}
      />
    </AppShell>
  );
}

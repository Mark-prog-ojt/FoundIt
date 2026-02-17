import { redirect } from "next/navigation";

export default async function LogoutPage() {
  // Trigger logout route (server will clear cookie)
  // We call the API route via redirect to keep it simple and consistent.
  redirect("/api/auth/logout");
}

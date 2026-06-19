import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/tenants";

// Route by role: Admins land on the overview, everyone else on the caller view.
export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = getUserProfile(session.user.email).role === "Admin";
  redirect(isAdmin ? "/admin" : "/sales");
}

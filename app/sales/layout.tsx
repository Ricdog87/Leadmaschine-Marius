import { redirect } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { activeTenant } from "@/lib/tenants";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = activeTenant();

  return (
    <div className="min-h-dvh bg-rsg-bg">
      <header className="sticky top-0 z-10 border-b border-rsg-border bg-rsg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-rsg-muted2 sm:inline">
              {tenant.branding.displayName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-rsg-muted sm:inline">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rsg-border px-2.5 py-1.5 text-xs text-rsg-muted transition hover:border-rsg-text/20 hover:text-rsg-text"
              >
                <LogOutIcon className="size-3.5" />
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">{children}</main>
    </div>
  );
}

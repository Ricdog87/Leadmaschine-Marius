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
            <div className="hidden border-l border-rsg-border pl-4 sm:block">
              <div className="font-display text-2xl font-medium leading-tight text-rsg-text">
                {tenant.branding.displayName}
              </div>
              <div className="font-mono text-xs uppercase tracking-wider text-rsg-muted">
                {tenant.branding.tagline}
              </div>
            </div>
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

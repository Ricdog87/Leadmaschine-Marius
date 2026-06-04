import { signIn } from "@/auth";
import { Wordmark } from "@/components/wordmark";

export const metadata = {
  title: "Anmelden · RSG·AI Sales Intelligence",
};

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return;
  // Sends the magic link via Resend, then redirects to verifyRequest
  // (/login?sent=1). Non-whitelisted emails are denied in the signIn callback.
  await signIn("resend", { email, redirectTo: "/sales" });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-rsg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-rsg-border bg-rsg-surface p-8 shadow-2xl">
          <div className="mb-8 flex justify-center">
            <Wordmark />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-rsg-text">
            Sales Intelligence
          </h1>
          <p className="mt-1 text-sm text-rsg-muted">
            Bitte mit deiner E-Mail anmelden.
          </p>

          {sent ? (
            <div className="mt-6 rounded-lg border border-rsg-accent/30 bg-rsg-accent/10 px-4 py-3 text-sm text-rsg-text">
              Link gesendet — check deine Mailbox.
            </div>
          ) : (
            <form action={sendMagicLink} className="mt-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-rsg-danger/40 bg-rsg-danger/10 px-4 py-3 text-sm text-rsg-danger">
                  Diese E-Mail ist nicht freigeschaltet. Bitte wende dich an
                  RSG·AI.
                </div>
              )}
              <div>
                <label htmlFor="email" className="sr-only">
                  E-Mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="du@firma.de"
                  className="w-full rounded-lg border border-rsg-border bg-rsg-surface2 px-4 py-2.5 text-sm text-rsg-text placeholder:text-rsg-muted2 outline-none transition focus:border-rsg-accent focus:ring-2 focus:ring-rsg-accent/40"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-rsg-accent px-4 py-2.5 text-sm font-semibold text-rsg-bg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-rsg-accent/50"
              >
                Magic Link senden
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-rsg-muted2">
          RSG·AI · sales.rsg-ai.de
        </p>
      </div>
    </main>
  );
}

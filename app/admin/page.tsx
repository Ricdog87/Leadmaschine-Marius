import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { google } from "googleapis";
import { auth, signOut } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { getAllLeads } from "@/lib/sheets";
import { activeTenant, getUserProfile, tenantUsers } from "@/lib/tenants";
import { formatEur, extractRegion } from "@/lib/lead-utils";
import { STATUSES, type Lead, type Status } from "@/lib/types";

// Admin overview must always reflect live sheet data.
export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · RSG·AI Sales Intelligence" };

const CALL_GOAL = 15;

const STATUS_TONE: Record<Status, string> = {
  Neu: "var(--color-rsg-muted)",
  Kontaktiert: "var(--color-rsg-accent)",
  Termin: "var(--color-rsg-accent)",
  Angebot: "var(--color-rsg-warn)",
  Gewonnen: "var(--color-rsg-ok)",
  Verloren: "var(--color-rsg-danger)",
};

// ── date helpers (Europe/Berlin) ──────────────────────────────
function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function berlinDaysAgo(n: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - n * 86400000));
}
/** Normalise a sheet date (ISO or German DD.MM.YYYY) to YYYY-MM-DD. */
function isoDate(d: string): string {
  const s = (d || "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) return `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`;
  return s;
}
function fmtDay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.` : iso;
}
const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

function tally(items: string[]): { key: string; count: number }[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = (it || "").trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

// ── team calls (read-only CallLog) ────────────────────────────
interface Rep {
  email: string;
  count: number;
}
async function readCallsToday(): Promise<{ reps: Rep[]; total: number }> {
  try {
    const tenant = activeTenant();
    const sheets = google.sheets({
      version: "v4",
      auth: new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      }),
    });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: tenant.sheetId,
      range: "CallLog!A2:D",
    });
    const today = berlinToday();
    const reps: Rep[] = (res.data.values ?? [])
      .filter((r) => String(r[0] ?? "").trim() === today)
      .map((r) => ({
        email: String(r[1] ?? "").trim().toLowerCase(),
        count: Math.max(0, parseInt(String(r[2] ?? "0"), 10) || 0),
      }))
      .filter((r) => r.email);
    return { reps, total: reps.reduce((a, r) => a + r.count, 0) };
  } catch {
    return { reps: [], total: 0 };
  }
}

// ── presentational bits ───────────────────────────────────────
function Stat({
  label,
  value,
  tone,
  delay,
}: {
  label: string;
  value: string;
  tone?: string;
  delay: number;
}) {
  return (
    <div
      className="kpi-enter rounded-xl border border-rsg-border bg-rsg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-rsg-accent/40"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-rsg-muted2">
        {label}
      </div>
      <div
        className="mt-2 font-display text-2xl font-bold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
  right,
}: {
  label: string;
  value: number;
  max: number;
  tone?: string;
  right?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-sm text-rsg-muted">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-rsg-border/50">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background:
              tone ??
              "linear-gradient(90deg, var(--color-rsg-accent), var(--color-rsg-ok))",
          }}
        />
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-sm tabular-nums text-rsg-text">
        {right ?? value.toLocaleString("de-DE")}
      </span>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="kpi-enter rounded-xl border border-rsg-border bg-rsg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-rsg-text">
          {title}
        </h2>
        {hint && (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-rsg-muted2">
            {hint}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const profile = getUserProfile(session.user.email);
  if (profile.role !== "Admin") redirect("/sales");

  const header = (
    <header className="sticky top-0 z-10 border-b border-rsg-border bg-rsg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-4">
          <Wordmark />
          <nav className="hidden items-center gap-1 border-l border-rsg-border pl-4 sm:flex">
            <a
              href="/admin"
              className="rounded-lg bg-rsg-accent/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-rsg-accent"
            >
              Übersicht
            </a>
            <a
              href="/sales"
              className="rounded-lg px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-rsg-muted transition hover:text-rsg-text"
            >
              Sales
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="flex items-center gap-1.5 text-sm font-medium text-rsg-text">
              {profile.nickname}
              <span className="rounded-full border border-rsg-accent/30 bg-rsg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rsg-accent">
                {profile.role}
              </span>
            </span>
            <span className="font-mono text-[10px] text-rsg-muted2">
              {session.user.email}
            </span>
          </div>
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
  );

  let leads: Lead[] | null = null;
  let error: string | null = null;
  try {
    leads = await getAllLeads();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unbekannter Fehler";
  }

  if (error || !leads) {
    return (
      <div className="min-h-dvh bg-rsg-bg">
        {header}
        <main className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
          <div className="rounded-xl border border-rsg-danger/40 bg-rsg-danger/10 p-6 text-sm text-rsg-danger">
            <p className="font-semibold">
              Sheet-Daten konnten nicht geladen werden.
            </p>
            <p className="mt-1 text-rsg-muted">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  const users = tenantUsers();
  const calls = await readCallsToday();

  // ── aggregations ──
  const total = leads.length;
  const cnt = (s: Status) => leads!.filter((l) => l.status === s).length;
  const byStatus = STATUSES.map((status) => ({ status, count: cnt(status) }));
  const inBearbeitung = leads.filter((l) =>
    ["Kontaktiert", "Termin", "Angebot"].includes(l.status),
  ).length;
  const won = cnt("Gewonnen");

  const sumPot = (rows: Lead[]) =>
    rows.reduce((a, l) => a + (l.pipeline_potenzial || 0), 0);
  const pipelineTotal = sumPot(leads);
  const pipelineOpen = sumPot(
    leads.filter((l) => ["Kontaktiert", "Termin", "Angebot"].includes(l.status)),
  );
  const wonValue = sumPot(leads.filter((l) => l.status === "Gewonnen"));

  const today = berlinToday();
  const weekAgo = berlinDaysAgo(6);
  const dated = leads.map((l) => isoDate(l.datum)).filter(Boolean);
  const todayNew = dated.filter((d) => d === today).length;
  const last7 = dated.filter((d) => d >= weekAgo && d <= today).length;

  const dateMap = new Map<string, number>();
  for (const d of dated) dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
  const timeline = [...dateMap.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (a.key < b.key ? 1 : -1))
    .slice(0, 14);
  const maxTimeline = Math.max(1, ...timeline.map((t) => t.count));

  const byWelle = tally(leads.map((l) => l.welle));
  const byBranche = tally(leads.map((l) => l.branche)).slice(0, 8);
  const byMarge = tally(leads.map((l) => l.marge_klasse));
  const byRegion = tally(leads.map((l) => extractRegion(l.adresse))).slice(0, 8);

  const repName = (email: string) =>
    users[email]?.short ?? (email.split("@")[0] || email);
  const callBoard = [...calls.reps].sort((a, b) => b.count - a.count).slice(0, 6);
  const callMax = Math.max(CALL_GOAL, ...callBoard.map((r) => r.count), 1);

  const stand = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const distros: { title: string; rows: { key: string; count: number }[] }[] = [
    { title: "Nach Welle", rows: byWelle },
    { title: "Nach Branche · Top 8", rows: byBranche },
    { title: "Nach Marge-Klasse", rows: byMarge },
    { title: "Nach Region · Top 8", rows: byRegion },
  ];

  return (
    <div className="min-h-dvh bg-rsg-bg">
      {header}
      <main className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-5 md:px-6">
        {/* hero */}
        <div className="kpi-enter flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rsg-accent/25 bg-gradient-to-r from-rsg-surface2 via-rsg-surface to-rsg-surface2 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rsg-accent opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rsg-accent" />
            </span>
            <span className="font-display text-2xl font-bold tabular-nums text-rsg-text">
              {total.toLocaleString("de-DE")}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-rsg-muted">
              Leads im System · Admin-Übersicht
            </span>
          </div>
          <span className="font-mono text-xs text-rsg-muted">Stand: {stand}</span>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Leads gesamt" value={total.toLocaleString("de-DE")} delay={40} />
          <Stat label="Heute neu" value={todayNew.toLocaleString("de-DE")} tone="var(--color-rsg-ok)" delay={80} />
          <Stat label="In Bearbeitung" value={inBearbeitung.toLocaleString("de-DE")} delay={120} />
          <Stat label="Termine" value={cnt("Termin").toLocaleString("de-DE")} tone="var(--color-rsg-accent)" delay={160} />
          <Stat label="Gewonnen" value={won.toLocaleString("de-DE")} tone="var(--color-rsg-ok)" delay={200} />
          <Stat label="Anrufe heute" value={calls.total.toLocaleString("de-DE")} delay={240} />
          <Stat label="Pipeline gesamt" value={formatEur(pipelineTotal)} tone="var(--color-rsg-accent)" delay={280} />
          <Stat label="Pipeline offen" value={formatEur(pipelineOpen)} delay={320} />
        </div>

        {/* funnel + timeline */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Status & Funnel" hint={`Conversion ${pctOf(won, total)}% · ${formatEur(wonValue)} gewonnen}`>
            {byStatus.map(({ status, count }) => (
              <Bar
                key={status}
                label={status}
                value={count}
                max={total}
                tone={STATUS_TONE[status]}
                right={`${count} · ${pctOf(count, total)}%`}
              />
            ))}
          </Section>

          <Section
            title="Neu eingespielte Leads"
            hint={`Heute ${todayNew} · 7 Tage ${last7}`}
          >
            {timeline.length === 0 && (
              <div className="rounded-lg border border-rsg-border bg-rsg-surface2 px-3 py-2 text-center font-mono text-xs text-rsg-muted2">
                Keine Datumsangaben in den Leads.
              </div>
            )}
            {timeline.map(({ key, count }) => (
              <Bar
                key={key}
                label={key === today ? `${fmtDay(key)} · heute` : fmtDay(key)}
                value={count}
                max={maxTimeline}
                tone={key === today ? "var(--color-rsg-ok)" : undefined}
              />
            ))}
          </Section>
        </div>

        {/* distributions */}
        <div className="grid gap-4 md:grid-cols-2">
          {distros.map((d) => {
            const max = Math.max(1, ...d.rows.map((r) => r.count));
            return (
              <Section key={d.title} title={d.title}>
                {d.rows.length === 0 && (
                  <div className="rounded-lg border border-rsg-border bg-rsg-surface2 px-3 py-2 text-center font-mono text-xs text-rsg-muted2">
                    Keine Daten.
                  </div>
                )}
                {d.rows.map((r) => (
                  <Bar key={r.key} label={r.key} value={r.count} max={max} />
                ))}
              </Section>
            );
          })}
        </div>

        {/* team activity */}
        <Section
          title="Team heute · Anrufe"
          hint={`${calls.total} gesamt · Ziel ${CALL_GOAL}/Person`}
        >
          {callBoard.length === 0 && (
            <div className="rounded-lg border border-rsg-border bg-rsg-surface2 px-3 py-2 text-center font-mono text-xs text-rsg-muted2">
              Noch keine Anrufe heute geloggt.
            </div>
          )}
          {callBoard.map((r) => (
            <Bar
              key={r.email}
              label={repName(r.email)}
              value={r.count}
              max={callMax}
              tone={
                r.count >= CALL_GOAL
                  ? "var(--color-rsg-ok)"
                  : "linear-gradient(90deg, var(--color-rsg-accent), var(--color-rsg-ok))"
              }
              right={`${r.count}/${CALL_GOAL}`}
            />
          ))}
        </Section>
      </main>
    </div>
  );
}

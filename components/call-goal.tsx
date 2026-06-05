"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_GOAL = 15;

interface Rep {
  email: string;
  count: number;
}
interface Stats {
  date: string;
  goal: number;
  reps: Rep[];
  me: string;
}

function localKey(): string {
  const d = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `rsg.callgoal.${d}`;
}

function nameOf(email: string): string {
  const local = (email.split("@")[0] || email).trim();
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initialsOf(email: string): string {
  const parts = nameOf(email).split(" ").filter(Boolean);
  const ini = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return ini || (email[0] ?? "?").toUpperCase();
}

/**
 * Gamified daily call goal with a glowing progress ring, aurora backdrop,
 * confetti on completion and a live team leaderboard. Counts persist per rep
 * in the Google Sheet (CallLog tab) via /api/calls; if that's unreachable it
 * falls back to a per-day localStorage counter so the UI never breaks.
 * Other components can log a call via window event "rsg:call-logged".
 */
export function CallGoal({ goal = DEFAULT_GOAL }: { goal?: number }) {
  const [reps, setReps] = useState<Rep[]>([]);
  const [me, setMe] = useState<string>("");
  const [goalN, setGoalN] = useState<number>(goal);
  const [online, setOnline] = useState<boolean>(true);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const celebrated = useRef(false);

  const applyStats = useCallback((s: Stats) => {
    const meEmail = (s.me ?? "").toLowerCase();
    const list = [...(s.reps ?? [])];
    if (meEmail && !list.some((r) => r.email === meEmail))
      list.push({ email: meEmail, count: 0 });
    setReps(list);
    setMe(meEmail);
    if (s.goal) setGoalN(s.goal);
    setOnline(true);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/calls", { cache: "no-store" });
        if (!r.ok) throw new Error("api");
        const s = (await r.json()) as Stats;
        if (!alive) return;
        applyStats(s);
        const my =
          (s.reps ?? []).find((x) => x.email === (s.me ?? "").toLowerCase())
            ?.count ?? 0;
        if (my >= (s.goal ?? goal)) celebrated.current = true;
      } catch {
        if (!alive) return;
        let n = 0;
        try {
          n = parseInt(localStorage.getItem(localKey()) ?? "0", 10) || 0;
        } catch {
          n = 0;
        }
        setOnline(false);
        setMe("");
        setReps([{ email: "", count: Math.max(0, n) }]);
        if (n >= goal) celebrated.current = true;
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyStats, goal]);

  const myCount = online
    ? (reps.find((r) => r.email === me)?.count ?? 0)
    : (reps[0]?.count ?? 0);

  const pct = Math.min(1, goalN > 0 ? myCount / goalN : 0);
  const remaining = Math.max(0, goalN - myCount);
  const done = myCount >= goalN;
  const teamTotal = reps.reduce((a, r) => a + r.count, 0);

  const fireConfetti = useCallback(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);
    const colors = ["#66fff0", "#34d399", "#fbbf24", "#f87171", "#fafafa"];
    const parts = Array.from({ length: 110 }, () => ({
      x: W / 2,
      y: H / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -11 - 2,
      g: 0.27 + Math.random() * 0.13,
      s: 4 + Math.random() * 5,
      c: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
    }));
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 1500);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6);
        ctx.restore();
      }
      if (t < 1500) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(tick);
  }, []);

  const checkCelebrate = useCallback(
    (next: number) => {
      if (next >= goalN && !celebrated.current) {
        celebrated.current = true;
        requestAnimationFrame(() => fireConfetti());
      }
      if (next < goalN) celebrated.current = false;
    },
    [goalN, fireConfetti],
  );

  const bump = useCallback(
    (delta: number) => {
      setReps((prev) => {
        if (!online) {
          const cur = prev[0]?.count ?? 0;
          const next = Math.max(0, cur + delta);
          try {
            localStorage.setItem(localKey(), String(next));
          } catch {
            /* ignore */
          }
          checkCelebrate(next);
          return [{ email: "", count: next }];
        }
        const idx = prev.findIndex((r) => r.email === me);
        let nextArr: Rep[];
        if (idx === -1)
          nextArr = delta > 0 ? [...prev, { email: me, count: 1 }] : prev;
        else
          nextArr = prev.map((r, i) =>
            i === idx ? { ...r, count: Math.max(0, r.count + delta) } : r,
          );
        checkCelebrate(nextArr.find((r) => r.email === me)?.count ?? 0);
        return nextArr;
      });
      if (online) {
        fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta }),
        })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("api"))))
          .then((s: Stats) => applyStats(s))
          .catch(() => setOnline(false));
      }
    },
    [online, me, checkCelebrate, applyStats],
  );

  useEffect(() => {
    const h = () => bump(1);
    window.addEventListener("rsg:call-logged", h);
    return () => window.removeEventListener("rsg:call-logged", h);
  }, [bump]);

  // ── ring geometry ──
  const size = 140;
  const stroke = 13;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const theta = ((pct * 360 - 90) * Math.PI) / 180;
  const tipX = cx + r * Math.cos(theta);
  const tipY = cy + r * Math.sin(theta);
  const glow = 4 + pct * 16;
  const endColor =
    done || pct >= 0.66
      ? "var(--color-rsg-ok)"
      : pct >= 0.33
        ? "var(--color-rsg-accent)"
        : "var(--color-rsg-accent)";

  const headline = done
    ? "🎯 Ziel erreicht — stark!"
    : pct >= 0.8
      ? `Endspurt — noch ${remaining}!`
      : pct >= 0.5
        ? `Dranbleiben — noch ${remaining}`
        : myCount === 0
          ? "Auf geht's — 15 heute!"
          : `noch ${remaining} Anrufe`;

  const board = [...reps]
    .filter((rp) => rp.count > 0 || rp.email === me || (!online && true))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const boardMax = Math.max(goalN, ...board.map((b) => b.count), 1);

  return (
    <div className="kpi-enter relative overflow-hidden rounded-2xl border border-rsg-border bg-rsg-surface p-5">
      {/* aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="rsg-aurora-a absolute -left-1/4 -top-1/2 h-[150%] w-2/3 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(102,255,240,0.16), transparent)",
          }}
        />
        <div
          className="rsg-aurora-b absolute -bottom-1/2 right-[-15%] h-[150%] w-2/3 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(52,211,153,0.14), transparent)",
          }}
        />
      </div>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />

      {/* top: ring + copy + controls */}
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size}>
            <defs>
              <linearGradient id="rsgRingGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-rsg-accent)" />
                <stop offset="100%" stopColor={endColor} />
              </linearGradient>
            </defs>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="var(--color-rsg-border)"
              strokeWidth={stroke}
            />
            <g transform={`rotate(-90 ${cx} ${cy})`}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="url(#rsgRingGrad)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                className={done ? "rsg-glow" : undefined}
                style={{
                  transition:
                    "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease",
                  filter: `drop-shadow(0 0 ${glow}px rgba(102,255,240,0.55))`,
                }}
              />
            </g>
            {pct > 0 && (
              <circle
                cx={tipX}
                cy={tipY}
                r={stroke / 2 + 1}
                fill={done ? "var(--color-rsg-ok)" : "var(--color-rsg-accent)"}
                style={{
                  filter: `drop-shadow(0 0 ${6 + pct * 10}px rgba(102,255,240,0.95))`,
                }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              key={myCount}
              className={cn(
                "rsg-pop font-display text-[2.6rem] font-bold leading-none tabular-nums",
                done ? "text-rsg-ok" : "text-rsg-text",
              )}
            >
              {myCount}
            </span>
            <span className="mt-1 font-mono text-[11px] uppercase tracking-widest text-rsg-muted2">
              / {goalN} Calls
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-rsg-muted2">
            Tagesziel · Anrufe
          </div>
          <div
            className={cn(
              "mt-1 font-display text-2xl font-bold",
              done ? "text-rsg-ok" : "text-rsg-text",
            )}
          >
            {headline}
          </div>
          <div className="mt-1 font-mono text-xs text-rsg-muted">
            {myCount} von {goalN} geführt · {Math.round(pct * 100)} %
          </div>
          <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-rsg-border/60">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pct * 100}%`,
                background:
                  "linear-gradient(90deg, var(--color-rsg-accent), var(--color-rsg-ok))",
              }}
            />
            {pct > 0 && !done && (
              <div
                className="rsg-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                }}
              />
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-stretch">
          <button
            type="button"
            onClick={() => bump(1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rsg-accent/40 bg-rsg-accent/10 px-5 py-3 font-display text-base font-semibold text-rsg-accent transition hover:bg-rsg-accent/20 active:scale-95"
          >
            <span className="text-lg leading-none">📞</span> Anruf +1
          </button>
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={myCount === 0}
            className="rounded-lg border border-rsg-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-rsg-muted2 transition hover:text-rsg-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            −1
          </button>
        </div>
      </div>

      {/* team leaderboard */}
      <div className="relative mt-5 border-t border-rsg-border pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-rsg-muted2">
            Team heute · Anrufe
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-rsg-muted2">
            <span
              className={cn(
                "size-1.5 rounded-full",
                online ? "bg-rsg-ok" : "bg-rsg-warn",
              )}
            />
            {online ? `${teamTotal} gesamt · im Sheet` : "offline · lokal"}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {board.length === 0 && (
            <div className="rounded-lg border border-rsg-border bg-rsg-surface2 px-3 py-2 text-center font-mono text-xs text-rsg-muted2">
              Noch keine Anrufe heute — leg los! 🚀
            </div>
          )}
          {board.map((rp, i) => {
            const mine = online ? rp.email === me : true;
            const label = online
              ? mine
                ? "Du"
                : nameOf(rp.email)
              : "Du";
            const reached = rp.count >= goalN;
            return (
              <div
                key={rp.email || "me"}
                className={cn(
                  "lead-enter flex items-center gap-3 rounded-lg border px-3 py-2",
                  mine
                    ? "border-rsg-accent/40 bg-rsg-accent/5"
                    : "border-rsg-border bg-rsg-surface2",
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold",
                    mine
                      ? "bg-rsg-accent/20 text-rsg-accent"
                      : "bg-rsg-border text-rsg-muted",
                  )}
                >
                  {online && rp.email ? initialsOf(rp.email) : "DU"}
                </span>
                <span
                  className={cn(
                    "w-28 shrink-0 truncate text-sm font-medium",
                    mine ? "text-rsg-text" : "text-rsg-muted",
                  )}
                >
                  {label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-rsg-border/50">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, (rp.count / boardMax) * 100)}%`,
                      background: reached
                        ? "var(--color-rsg-ok)"
                        : "linear-gradient(90deg, var(--color-rsg-accent), var(--color-rsg-ok))",
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-rsg-text">
                  {rp.count}
                  <span className="text-rsg-muted2">/{goalN}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

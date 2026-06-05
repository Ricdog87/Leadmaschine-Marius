"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_GOAL = 15;

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `rsg.callgoal.${d.getFullYear()}-${m}-${day}`;
}

interface CallGoalProps {
  goal?: number;
}

/**
 * Gamified daily call goal. Counts logged calls toward a target (default 15),
 * persists per-day in localStorage, fills a ring (red -> amber -> green) and
 * fires a confetti burst on completion. Any component can log a call by
 * dispatching the window event "rsg:call-logged".
 */
export function CallGoal({ goal = DEFAULT_GOAL }: CallGoalProps) {
  const [count, setCount] = useState(0);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const celebrated = useRef(false);

  useEffect(() => {
    let n = 0;
    try {
      const raw = localStorage.getItem(todayKey());
      n = raw ? parseInt(raw, 10) : 0;
    } catch {
      n = 0;
    }
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (n >= goal) celebrated.current = true;
    setCount(n);
    setReady(true);
  }, [goal]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(todayKey(), String(count));
    } catch {
      /* ignore */
    }
  }, [count, ready]);

  const fireConfetti = useCallback(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = (canvas.width = canvas.offsetWidth);
    const H = (canvas.height = canvas.offsetHeight);
    const colors = ["#66fff0", "#34d399", "#fbbf24", "#f87171", "#fafafa"];
    const parts = Array.from({ length: 80 }, () => ({
      x: W / 2,
      y: H / 2,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * -10 - 2,
      g: 0.28 + Math.random() * 0.12,
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
        ctx.globalAlpha = Math.max(0, 1 - t / 1400);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6);
        ctx.restore();
      }
      if (t < 1400) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(tick);
  }, []);

  const bump = useCallback(
    (delta: number) => {
      setCount((c) => {
        const next = Math.max(0, c + delta);
        if (next >= goal && !celebrated.current) {
          celebrated.current = true;
          requestAnimationFrame(() => fireConfetti());
        }
        if (next < goal) celebrated.current = false;
        return next;
      });
    },
    [goal, fireConfetti],
  );

  useEffect(() => {
    const handler = () => bump(1);
    window.addEventListener("rsg:call-logged", handler);
    return () => window.removeEventListener("rsg:call-logged", handler);
  }, [bump]);

  const pct = Math.min(1, goal > 0 ? count / goal : 0);
  const remaining = Math.max(0, goal - count);
  const done = count >= goal;

  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const ringColor = done
    ? "var(--color-rsg-ok)"
    : pct >= 0.5
      ? "var(--color-rsg-warn)"
      : "var(--color-rsg-danger)";

  return (
    <div
      className={cn(
        "kpi-enter relative overflow-hidden rounded-2xl border bg-gradient-to-br from-rsg-surface2 via-rsg-surface to-rsg-bg p-5 transition-colors duration-500",
        done ? "border-rsg-ok/50" : "border-rsg-border",
      )}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--color-rsg-border)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className={done ? "rsg-glow" : undefined}
              style={{
                transition:
                  "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              key={count}
              className="rsg-pop font-display text-4xl font-bold leading-none text-rsg-text tabular-nums"
            >
              {count}
            </span>
            <span className="mt-1 font-mono text-[11px] uppercase tracking-widest text-rsg-muted2">
              / {goal}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-rsg-muted2">
            Tagesziel · Anrufe
          </div>
          {done ? (
            <div className="mt-1 font-display text-2xl font-bold text-rsg-ok">
              🎯 Ziel erreicht — stark!
            </div>
          ) : (
            <div className="mt-1 font-display text-2xl font-bold text-rsg-text">
              noch{" "}
              <span className="tabular-nums text-rsg-accent">{remaining}</span>{" "}
              {remaining === 1 ? "Anruf" : "Anrufe"}
            </div>
          )}
          <div className="mt-1 font-mono text-xs text-rsg-muted">
            {count} von {goal} geführt · {Math.round(pct * 100)} %
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-rsg-border/60">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pct * 100}%`,
                background: `linear-gradient(90deg, ${ringColor}, var(--color-rsg-accent))`,
              }}
            />
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
            disabled={count === 0}
            className="rounded-lg border border-rsg-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-rsg-muted2 transition hover:text-rsg-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            −1
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/lead-utils";
import type { Kpis } from "@/lib/types";

/** Animated count-up (easeOutCubic) driven by requestAnimationFrame. */
function useCountUp(target: number, durationMs = 900) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return val;
}

/** Live wall-clock that ticks every second (null until mounted to avoid SSR mismatch). */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const fmtDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const fmtTime = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function CountValue({ value, eur = false }: { value: number; eur?: boolean }) {
  const v = useCountUp(value);
  const rounded = Math.round(v);
  return <>{eur ? formatEur(rounded) : rounded.toLocaleString("de-DE")}</>;
}

function KpiCard({
  label,
  value,
  eur,
  accent,
  delay,
}: {
  label: string;
  value: number;
  eur?: boolean;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div
      className="kpi-enter group relative overflow-hidden rounded-xl border border-rsg-border bg-rsg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-rsg-accent/40 hover:shadow-[0_0_0_1px_rgba(102,255,240,0.12),0_10px_30px_-14px_rgba(102,255,240,0.45)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-rsg-accent to-transparent opacity-0 transition-all duration-300 group-hover:scale-x-100 group-hover:opacity-100" />
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-rsg-muted2">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-display text-2xl font-bold tracking-tight tabular-nums",
          accent ? "text-rsg-danger" : "text-rsg-text",
        )}
      >
        <CountValue value={value} eur={eur} />
      </div>
    </div>
  );
}

interface KpiStripProps {
  kpis: Kpis;
  /** Total live leads currently loaded from the sheet. */
  total: number;
}

/** Live-leads banner (with live clock) + animated 1x4 KPI strip. */
export function KpiStrip({ kpis, total }: KpiStripProps) {
  const live = useCountUp(total);
  const now = useNow();
  return (
    <div className="flex flex-col gap-3">
      <div className="kpi-enter relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-rsg-accent/25 bg-gradient-to-r from-rsg-surface2 via-rsg-surface to-rsg-surface2 px-4 py-3">
        <span
          className="rsg-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-rsg-accent/10 to-transparent"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rsg-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rsg-accent" />
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-rsg-text">
            {Math.round(live).toLocaleString("de-DE")}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-rsg-muted">
            Live-Leads im System
          </span>
        </div>
        <div className="relative flex items-center gap-3">
          <span
            className="font-mono text-xs tabular-nums text-rsg-text"
            suppressHydrationWarning
          >
            {now ? `${fmtDate.format(now)} · ${fmtTime.format(now)}` : "—"}
          </span>
          <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-rsg-ok sm:inline-flex">
            <span className="size-1.5 animate-pulse rounded-full bg-rsg-ok" />
            Echtzeit
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Heute neu" value={kpis.today_new} delay={60} />
        <KpiCard label="HOCH offen" value={kpis.hoch_open} accent delay={120} />
        <KpiCard label="Termine" value={kpis.termine} delay={180} />
        <KpiCard
          label="Pipeline-Wert"
          value={kpis.pipeline_value_eur}
          eur
          delay={240}
        />
      </div>
    </div>
  );
}

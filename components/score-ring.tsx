"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  /** SEO score, 0–100. */
  value: number;
  size?: number;
  className?: string;
}

/** SVG donut visualising a 0–100 score; animates from 0 on mount. */
export function ScoreRing({ value, size = 72, className }: ScoreRingProps) {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = size < 56 ? 5 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const [shown, setShown] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    let raf = 0;
    const from = fromRef.current;
    const start = performance.now();
    const dur = 800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const offset = circumference * (1 - shown / 100);
  const display = Math.round(shown);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-rsg-border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-rsg-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-semibold text-rsg-text tabular-nums"
          style={{ fontSize: size * 0.26 }}
        >
          {display}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-wider text-rsg-muted2">
          SEO
        </span>
      </div>
    </div>
  );
}

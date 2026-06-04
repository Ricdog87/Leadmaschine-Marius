import { cn } from "@/lib/utils";

interface ScoreRingProps {
  /** SEO score, 0–100. */
  value: number;
  size?: number;
  className?: string;
}

/** SVG donut visualising a 0–100 score with an aqua accent fill. */
export function ScoreRing({ value, size = 72, className }: ScoreRingProps) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = size < 56 ? 5 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - v / 100);

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
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-semibold text-rsg-text"
          style={{ fontSize: size * 0.26 }}
        >
          {v}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-wider text-rsg-muted2">
          SEO
        </span>
      </div>
    </div>
  );
}

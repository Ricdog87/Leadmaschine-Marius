import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Show the "Sales Intelligence" sub-label beneath the wordmark. */
  showSubLabel?: boolean;
}

/**
 * RSG·AI wordmark — "RSG" white · "|" muted · "AI" aqua,
 * with an optional "Sales Intelligence" sub-label.
 */
export function Wordmark({ className, showSubLabel = true }: WordmarkProps) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-lg font-bold tracking-tight">
        <span className="text-rsg-text">RSG</span>
        <span className="mx-1 text-rsg-muted2 font-normal">|</span>
        <span className="text-rsg-accent">AI</span>
      </span>
      {showSubLabel && (
        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-rsg-muted2">
          Sales Intelligence
        </span>
      )}
    </div>
  );
}

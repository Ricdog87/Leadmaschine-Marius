"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PitchCardProps {
  pitch: string;
}

/** Sales-pitch card with a copy-to-clipboard action. */
export function PitchCard({ pitch }: PitchCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!pitch) return;
    try {
      await navigator.clipboard.writeText(pitch);
      setCopied(true);
      toast.success("Pitch kopiert");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  return (
    <div className="rounded-xl border border-rsg-border bg-rsg-surface2 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-rsg-muted2">
          Sales-Pitch
        </h3>
        <button
          type="button"
          onClick={copy}
          disabled={!pitch}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-rsg-border px-2.5 py-1 text-xs text-rsg-muted transition",
            "hover:border-rsg-accent/40 hover:text-rsg-accent disabled:opacity-40",
          )}
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? "Kopiert" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-rsg-text">
        {pitch || (
          <span className="text-rsg-muted2">Kein Pitch hinterlegt.</span>
        )}
      </p>
    </div>
  );
}

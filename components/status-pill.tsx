"use client";

import { cn } from "@/lib/utils";
import { statusClasses } from "@/lib/lead-utils";
import type { Status } from "@/lib/types";

interface StatusPillProps {
  status: Status;
  active: boolean;
  disabled?: boolean;
  onClick?: (status: Status) => void;
}

/** Clickable status chip. Active state is colour-coded by status. */
export function StatusPill({ status, active, disabled, onClick }: StatusPillProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={() => onClick?.(status)}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        "hover:border-rsg-text/30 hover:text-rsg-text",
        "disabled:cursor-not-allowed disabled:opacity-50",
        statusClasses(status, active),
      )}
    >
      {status}
    </button>
  );
}

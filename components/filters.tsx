"use client";

import { cn } from "@/lib/utils";

export type FilterKey = "branche" | "region" | "prio" | "status";

export interface FilterGroup {
  key: FilterKey;
  label: string;
  options: string[];
}

interface FiltersProps {
  groups: FilterGroup[];
  active: Record<FilterKey, string[]>;
  onToggle: (key: FilterKey, value: string) => void;
  onClear: () => void;
}

/** Multi-select chip filter bar. State is mirrored to the URL by the parent. */
export function Filters({ groups, active, onToggle, onClear }: FiltersProps) {
  const hasActive = Object.values(active).some((arr) => arr.length > 0);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rsg-border bg-rsg-surface p-4">
      {groups.map((group) =>
        group.options.length === 0 ? null : (
          <div key={group.key} className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-rsg-muted2">
              {group.label}
            </span>
            {group.options.map((opt) => {
              const on = active[group.key].includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(group.key, opt)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition",
                    on
                      ? "border-rsg-accent/50 bg-rsg-accent/15 text-rsg-accent"
                      : "border-rsg-border bg-rsg-surface2 text-rsg-muted hover:border-rsg-text/20 hover:text-rsg-text",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ),
      )}
      {hasActive && (
        <button
          type="button"
          onClick={onClear}
          className="self-start font-mono text-[10px] uppercase tracking-wider text-rsg-muted2 hover:text-rsg-accent"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}

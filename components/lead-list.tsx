"use client";

import { cn } from "@/lib/utils";
import { prioClasses, sortLeads } from "@/lib/lead-utils";
import type { Lead } from "@/lib/types";

interface LeadListProps {
  leads: Lead[];
  selectedDomain: string | null;
  onSelect: (lead: Lead) => void;
}

function Dot({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider",
        on ? "text-rsg-ok" : "text-rsg-muted2",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          on ? "bg-rsg-ok" : "bg-rsg-muted2/50",
        )}
      />
      {label}
    </span>
  );
}

/** Scrollable lead list, sorted HOCH → MITTEL → NIEDRIG. */
export function LeadList({ leads, selectedDomain, onSelect }: LeadListProps) {
  const sorted = sortLeads(leads);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-rsg-border bg-rsg-surface p-8 text-center text-sm text-rsg-muted">
        Keine Leads für die aktuellen Filter.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-13rem)]">
      {sorted.map((lead, i) => {
        const active = lead.domain === selectedDomain;
        return (
          <button
            key={lead.domain}
            type="button"
            onClick={() => onSelect(lead)}
            style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
            className={cn(
              "lead-enter w-full rounded-xl border bg-rsg-surface p-3.5 text-left transition-all duration-200",
              active
                ? "border-rsg-accent/60 ring-1 ring-rsg-accent/30"
                : "border-rsg-border hover:-translate-y-px hover:border-rsg-accent/30 hover:shadow-[0_0_0_1px_rgba(102,255,240,0.08),0_8px_24px_-16px_rgba(102,255,240,0.55)]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-semibold text-rsg-text">
                  {lead.firma || lead.domain}
                </div>
                <div className="truncate font-mono text-xs text-rsg-muted2">
                  {lead.domain}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  prioClasses(lead.lead_prio),
                )}
              >
                {lead.lead_prio}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-rsg-muted2">
                SEO{" "}
                <span className="text-rsg-text">{Math.round(lead.seo_score)}</span>
              </span>
              <Dot on={lead.money_kw_top10 === "Ja"} label="Money" />
              <Dot on={lead.geo_sichtbar === "Ja"} label="GEO" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

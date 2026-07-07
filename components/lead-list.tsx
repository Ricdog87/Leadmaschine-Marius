"use client";

import { useMemo } from "react";
import { MapPinIcon, CalendarClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { prioClasses, extractOrt } from "@/lib/lead-utils";
import { PRIO_RANK } from "@/lib/lead-utils";
import type { Lead } from "@/lib/types";

interface LeadListProps {
  leads: Lead[];
  selectedDomain: string | null;
  onSelect: (lead: Lead) => void;
  /** Newest run date in the dataset — leads with this date are flagged "NEU". */
  freshDate?: string;
  /** Follow-up dates per domain (Wiedervorlage). */
  followUps?: Record<string, { date: string; note: string }>;
  /** Local YYYY-MM-DD — a follow-up on or before today is "due". */
  today?: string;
  /** Domains already called (per-lead call log). */
  calledLeads?: Record<string, { count: number; last: string }>;
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

/** Scrollable lead list — fresh leads first, then HOCH → MITTEL → NIEDRIG. */
export function LeadList({
  leads,
  selectedDomain,
  onSelect,
  freshDate,
  followUps,
  today,
  calledLeads,
}: LeadListProps) {
  const sorted = useMemo(() => {
    return [...leads].sort((a, b) => {
      const aFresh = freshDate && a.datum === freshDate ? 0 : 1;
      const bFresh = freshDate && b.datum === freshDate ? 0 : 1;
      if (aFresh !== bFresh) return aFresh - bFresh;
      const byPrio = PRIO_RANK[a.lead_prio] - PRIO_RANK[b.lead_prio];
      if (byPrio !== 0) return byPrio;
      return a.firma.localeCompare(b.firma, "de");
    });
  }, [leads, freshDate]);

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
        const isFresh = Boolean(freshDate) && lead.datum === freshDate;
        const ort = extractOrt(lead.adresse);
        const fu = followUps?.[lead.domain];
        const due = Boolean(fu?.date && today && fu.date <= today);
        const called = calledLeads?.[lead.domain];
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
                : isFresh
                  ? "border-rsg-accent/30 hover:-translate-y-px hover:border-rsg-accent/50 hover:shadow-[0_0_0_1px_rgba(102,255,240,0.10),0_8px_24px_-16px_rgba(102,255,240,0.6)]"
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
              <div className="flex shrink-0 items-center gap-1.5">
                {called && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rsg-ok/50 bg-rsg-ok/15 px-2 py-0.5 text-[10px] font-semibold text-rsg-ok">
                    <span className="size-1 rounded-full bg-rsg-ok" />
                    ANGERUFEN
                  </span>
                )}
                {isFresh && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rsg-accent/50 bg-rsg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-rsg-accent">
                    <span className="size-1 rounded-full bg-rsg-accent" />
                    NEU
                  </span>
                )}
                {fu?.date && (
                  <span
                    title={`Wiedervorlage ${fu.date}${fu.note ? " · " + fu.note : ""}`}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      due
                        ? "border-rsg-warn/50 bg-rsg-warn/15 text-rsg-warn"
                        : "border-rsg-border bg-rsg-surface2 text-rsg-muted2",
                    )}
                  >
                    <CalendarClockIcon className="size-3" />
                    {fu.date.slice(8, 10)}.{fu.date.slice(5, 7)}.
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    prioClasses(lead.lead_prio),
                  )}
                >
                  {lead.lead_prio}
                </span>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-rsg-muted2">
                {lead.branche || "—"}
              </span>
              {ort && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-rsg-muted2">
                  <MapPinIcon className="size-3" />
                  {ort}
                </span>
              )}
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

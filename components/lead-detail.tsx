"use client";

import { MapPinIcon, PhoneIcon, StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { prioClasses } from "@/lib/lead-utils";
import { STATUSES, type Lead, type Status } from "@/lib/types";
import { ScoreRing } from "@/components/score-ring";
import { PitchCard } from "@/components/pitch-card";
import { StatusPill } from "@/components/status-pill";

interface LeadDetailProps {
  lead: Lead | null;
  pending: boolean;
  onStatusChange: (lead: Lead, status: Status) => void;
}

function StatCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-rsg-border bg-rsg-surface2 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-rsg-muted2">
        {label}
      </div>
      {children}
    </div>
  );
}

function YesNo({ value }: { value: "Ja" | "Nein" }) {
  const yes = value === "Ja";
  return (
    <span
      className={cn(
        "font-display text-lg font-bold",
        yes ? "text-rsg-ok" : "text-rsg-muted2",
      )}
    >
      {yes ? "Ja" : "Nein"}
    </span>
  );
}

/** Sticky detail panel for the selected lead. */
export function LeadDetail({ lead, pending, onStatusChange }: LeadDetailProps) {
  if (!lead) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-rsg-border bg-rsg-surface p-8 text-center text-sm text-rsg-muted lg:sticky lg:top-4">
        Wähle links einen Lead aus, um Details zu sehen.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-4">
      {/* Hero */}
      <div className="rounded-xl border border-rsg-border bg-rsg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-tight text-rsg-text">
              {lead.firma || lead.domain}
            </h2>
            <a
              href={`https://${lead.domain.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-rsg-accent hover:underline"
            >
              {lead.domain}
            </a>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              prioClasses(lead.lead_prio),
            )}
          >
            {lead.lead_prio}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-rsg-muted">
          {lead.adresse && (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 text-rsg-muted2" />
              {lead.adresse}
            </span>
          )}
          {lead.telefon && (
            <span className="inline-flex items-center gap-1.5">
              <PhoneIcon className="size-3.5 text-rsg-muted2" />
              {lead.telefon}
            </span>
          )}
          {lead.google_rating > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StarIcon className="size-3.5 text-rsg-warn" />
              {lead.google_rating.toLocaleString("de-DE")}
              {lead.reviews > 0 && (
                <span className="text-rsg-muted2">({lead.reviews})</span>
              )}
            </span>
          )}
        </div>
        {(lead.branche || lead.shop_system) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lead.branche && (
              <span className="rounded-md border border-rsg-border bg-rsg-surface2 px-2 py-0.5 text-xs text-rsg-muted">
                {lead.branche}
              </span>
            )}
            {lead.shop_system && (
              <span className="rounded-md border border-rsg-border bg-rsg-surface2 px-2 py-0.5 text-xs text-rsg-muted">
                {lead.shop_system}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="SEO-Score">
          <ScoreRing value={lead.seo_score} size={64} />
        </StatCard>
        <StatCard label="Money-KW">
          <YesNo value={lead.money_kw_top10} />
        </StatCard>
        <StatCard label="GEO sichtbar">
          <YesNo value={lead.geo_sichtbar} />
        </StatCard>
      </div>

      {/* Construction sites / visibility */}
      {(lead.baustellen || lead.sichtbarkeit) && (
        <div className="grid gap-3 rounded-xl border border-rsg-border bg-rsg-surface2 p-4 text-sm">
          {lead.sichtbarkeit && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-rsg-muted2">
                Sichtbarkeit
              </span>
              <p className="mt-0.5 text-rsg-text">{lead.sichtbarkeit}</p>
            </div>
          )}
          {lead.baustellen && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-rsg-muted2">
                Baustellen
              </span>
              <p className="mt-0.5 whitespace-pre-wrap text-rsg-text">
                {lead.baustellen}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pitch */}
      <PitchCard pitch={lead.sales_pitch} />

      {/* Status actions */}
      <div className="rounded-xl border border-rsg-border bg-rsg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-rsg-muted2">
            Status
          </h3>
          {pending && (
            <span className="font-mono text-[10px] text-rsg-muted2">
              speichern…
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <StatusPill
              key={s}
              status={s}
              active={lead.status === s}
              disabled={pending}
              onClick={(next) => {
                if (next !== lead.status) onStatusChange(lead, next);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

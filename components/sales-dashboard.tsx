"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { extractRegion } from "@/lib/lead-utils";
import { PRIOS, STATUSES, type Kpis, type Lead, type Status } from "@/lib/types";
import { CallGoal } from "@/components/call-goal";
import { KpiStrip } from "@/components/kpi-strip";
import {
  Filters,
  type FilterGroup,
  type FilterKey,
} from "@/components/filters";
import { LeadList } from "@/components/lead-list";
import { LeadDetail } from "@/components/lead-detail";

interface SalesDashboardProps {
  leads: Lead[];
  kpis: Kpis;
}

const FILTER_KEYS: FilterKey[] = [
  "branche",
  "region",
  "welle",
  "akquiseform",
  "prio",
  "status",
];

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "de"),
  );
}

export function SalesDashboard({ leads, kpis }: SalesDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [updatingDomain, setUpdatingDomain] = useState<string | null>(null);

  const active = useMemo(() => {
    const out = {} as Record<FilterKey, string[]>;
    for (const key of FILTER_KEYS) {
      const raw = searchParams.get(key);
      out[key] = raw ? raw.split(",").filter(Boolean) : [];
    }
    return out;
  }, [searchParams]);

  const leadsWithRegion = useMemo(
    () => leads.map((l) => ({ lead: l, region: extractRegion(l.adresse) })),
    [leads],
  );

  const groups: FilterGroup[] = useMemo(
    () => [
      {
        key: "branche",
        label: "Branche",
        options: uniqueSorted(leads.map((l) => l.branche)),
      },
      {
        key: "region",
        label: "Region",
        options: uniqueSorted(leadsWithRegion.map((l) => l.region)),
      },
      {
        key: "welle",
        label: "Welle",
        options: uniqueSorted(leads.map((l) => l.welle)),
      },
      {
        key: "akquiseform",
        label: "Akquise",
        options: uniqueSorted(leads.map((l) => l.akquise_form)),
      },
      { key: "prio", label: "Prio", options: [...PRIOS] },
      { key: "status", label: "Status", options: [...STATUSES] },
    ],
    [leads, leadsWithRegion],
  );

  const filtered = useMemo(() => {
    return leadsWithRegion
      .filter(({ lead, region }) => {
        if (active.branche.length && !active.branche.includes(lead.branche))
          return false;
        if (active.region.length && !active.region.includes(region))
          return false;
        if (active.welle.length && !active.welle.includes(lead.welle))
          return false;
        if (
          active.akquiseform.length &&
          !active.akquiseform.includes(lead.akquise_form)
        )
          return false;
        if (active.prio.length && !active.prio.includes(lead.lead_prio))
          return false;
        if (active.status.length && !active.status.includes(lead.status))
          return false;
        return true;
      })
      .map(({ lead }) => lead);
  }, [leadsWithRegion, active]);

  const selected =
    leads.find((l) => l.domain === selectedDomain) ?? null;

  // Newest run date present in the data — used to flag fresh leads.
  const freshDate = useMemo(
    () => leads.reduce((m, l) => (l.datum > m ? l.datum : m), ""),
    [leads],
  );

  function setFilterParam(next: Record<FilterKey, string[]>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) {
      if (next[key].length) params.set(key, next[key].join(","));
      else params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function toggleFilter(key: FilterKey, value: string) {
    const current = active[key];
    const nextForKey = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFilterParam({ ...active, [key]: nextForKey });
  }

  function clearFilters() {
    const empty = {} as Record<FilterKey, string[]>;
    for (const key of FILTER_KEYS) empty[key] = [];
    setFilterParam(empty);
  }

  async function changeStatus(lead: Lead, status: Status) {
    setUpdatingDomain(lead.domain);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.domain)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const msg =
          res.status === 404
            ? "Lead im Sheet nicht gefunden"
            : "Status-Update fehlgeschlagen";
        throw new Error(msg);
      }
      toast.success(`Status → ${status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setUpdatingDomain(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CallGoal />
      <KpiStrip kpis={kpis} total={leads.length} />
      <Filters
        groups={groups}
        active={active}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1.6fr]">
        <LeadList
          leads={filtered}
          selectedDomain={selectedDomain}
          freshDate={freshDate}
          onSelect={(lead) => setSelectedDomain(lead.domain)}
        />
        <LeadDetail
          lead={selected}
          pending={isPending || updatingDomain === selected?.domain}
          onStatusChange={changeStatus}
        />
      </div>
    </div>
  );
}

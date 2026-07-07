"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SearchIcon, XIcon } from "lucide-react";
import { extractRegion, extractOrt, isLocalRegion } from "@/lib/lead-utils";
import { PRIOS, STATUSES, type Kpis, type Lead, type Status } from "@/lib/types";
import type { UserProfile } from "@/lib/tenants";
import { CallGoal } from "@/components/call-goal";
import { KpiStrip } from "@/components/kpi-strip";
import {
  Filters,
  type FilterGroup,
  type FilterKey,
} from "@/components/filters";
import { LeadList } from "@/components/lead-list";
import { LeadDetail } from "@/components/lead-detail";

/** Wiedervorlage (follow-up) for a lead — stored in a separate sheet tab. */
export interface FollowUp {
  date: string; // YYYY-MM-DD ("" = none)
  note: string;
}

interface SalesDashboardProps {
  leads: Lead[];
  kpis: Kpis;
  users: Record<string, UserProfile>;
  followUps?: Record<string, FollowUp>;
  notes?: Record<string, { note: string }>;
  calledLeads?: Record<string, { count: number; last: string }>;
}

const FILTER_KEYS: FilterKey[] = [
  "branche",
  "region",
  "ort",
  "lokal",
  "welle",
  "akquiseform",
  "prio",
  "status",
  "wiedervorlage",
];

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "de"),
  );
}

/** Local YYYY-MM-DD — used to flag a Wiedervorlage as due (≤ today). */
function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function SalesDashboard({
  leads,
  kpis,
  users,
  followUps = {},
  notes = {},
  calledLeads = {},
}: SalesDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [updatingDomain, setUpdatingDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const today = todayYMD();

  const active = useMemo(() => {
    const out = {} as Record<FilterKey, string[]>;
    for (const key of FILTER_KEYS) {
      const raw = searchParams.get(key);
      out[key] = raw ? raw.split(",").filter(Boolean) : [];
    }
    return out;
  }, [searchParams]);

  const leadsWithGeo = useMemo(
    () =>
      leads.map((l) => {
        const fu = followUps[l.domain];
        return {
          lead: l,
          region: extractRegion(l.adresse),
          ort: extractOrt(l.adresse),
          local: isLocalRegion(l.adresse),
          due: Boolean(fu && fu.date && fu.date <= today),
        };
      }),
    [leads, followUps, today],
  );

  // Ort filter chips: cities with ≥2 leads, most frequent first (cap 24).
  const ortOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { ort } of leadsWithGeo) {
      if (!ort) continue;
      counts.set(ort, (counts.get(ort) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
      .slice(0, 24)
      .map(([ort]) => ort);
  }, [leadsWithGeo]);

  const hasLocal = useMemo(() => leadsWithGeo.some((l) => l.local), [leadsWithGeo]);
  const hasDue = useMemo(() => leadsWithGeo.some((l) => l.due), [leadsWithGeo]);

  const groups: FilterGroup[] = useMemo(
    () => [
      { key: "lokal", label: "Lokal", options: hasLocal ? ["Rhein-Main"] : [] },
      {
        key: "wiedervorlage",
        label: "WV",
        options: hasDue ? ["Fällig"] : [],
      },
      {
        key: "branche",
        label: "Branche",
        options: uniqueSorted(leads.map((l) => l.branche)),
      },
      { key: "ort", label: "Ort", options: ortOptions },
      {
        key: "region",
        label: "Land",
        options: uniqueSorted(leadsWithGeo.map((l) => l.region)),
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
    [leads, leadsWithGeo, ortOptions, hasLocal, hasDue],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leadsWithGeo
      .filter(({ lead, region, ort, local, due }) => {
        if (
          q &&
          !`${lead.firma} ${lead.domain} ${ort}`.toLowerCase().includes(q)
        )
          return false;
        if (active.branche.length && !active.branche.includes(lead.branche))
          return false;
        if (active.region.length && !active.region.includes(region))
          return false;
        if (active.ort.length && !active.ort.includes(ort)) return false;
        if (active.lokal.length && !local) return false;
        if (active.wiedervorlage.length && !due) return false;
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
  }, [leadsWithGeo, active, query]);

  const selected = leads.find((l) => l.domain === selectedDomain) ?? null;
  const selectedFollowUp = selected ? followUps[selected.domain] : undefined;

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

  async function setFollowUp(lead: Lead, date: string, note: string) {
    setUpdatingDomain(lead.domain);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wiedervorlage: date, note }),
      });
      if (!res.ok) {
        throw new Error("Wiedervorlage konnte nicht gespeichert werden");
      }
      toast.success(date ? `Wiedervorlage → ${date}` : "Wiedervorlage entfernt");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setUpdatingDomain(null);
    }
  }

  async function setNote(lead: Lead, note: string) {
    setUpdatingDomain(lead.domain);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notiz: note }),
      });
      if (!res.ok) throw new Error("Notiz konnte nicht gespeichert werden");
      toast.success("Notiz gespeichert");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setUpdatingDomain(null);
    }
  }

  async function logCallLead(lead: Lead) {
    try {
      await fetch(`/api/leads/${encodeURIComponent(lead.domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call: true }),
      });
      startTransition(() => router.refresh());
    } catch {
      /* daily counter already recorded via the window event; ignore */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CallGoal users={users} />
      <KpiStrip kpis={kpis} total={leads.length} />
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rsg-muted2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lead suchen (Firma, Domain, Ort)…"
          className="w-full rounded-xl border border-rsg-border bg-rsg-surface py-2.5 pl-9 pr-9 text-sm text-rsg-text outline-none placeholder:text-rsg-muted2 focus:border-rsg-accent/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Suche löschen"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-rsg-muted2 transition hover:text-rsg-text"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
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
          followUps={followUps}
          calledLeads={calledLeads}
          today={today}
          onSelect={(lead) => setSelectedDomain(lead.domain)}
        />
        <LeadDetail
          lead={selected}
          pending={isPending || updatingDomain === selected?.domain}
          followUp={selectedFollowUp}
          note={selected ? notes[selected.domain]?.note ?? "" : ""}
          called={selected ? calledLeads[selected.domain] : undefined}
          onStatusChange={changeStatus}
          onSetFollowUp={setFollowUp}
          onSetNote={setNote}
          onCall={logCallLead}
        />
      </div>
    </div>
  );
}

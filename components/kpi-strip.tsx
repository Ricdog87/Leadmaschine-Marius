import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/lead-utils";
import type { Kpis } from "@/lib/types";

interface KpiStripProps {
  kpis: Kpis;
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-rsg-border bg-rsg-surface p-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-rsg-muted2">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-display text-2xl font-bold tracking-tight",
          accent ? "text-rsg-danger" : "text-rsg-text",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** 1×4 KPI strip: today new, HOCH open, appointments, pipeline value. */
export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard label="Heute neu" value={String(kpis.today_new)} />
      <KpiCard label="HOCH offen" value={String(kpis.hoch_open)} accent />
      <KpiCard label="Termine" value={String(kpis.termine)} />
      <KpiCard label="Pipeline-Wert" value={formatEur(kpis.pipeline_value_eur)} />
    </div>
  );
}

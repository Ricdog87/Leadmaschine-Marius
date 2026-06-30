import { getAllLeads, getKpis } from "@/lib/sheets";
import { tenantUsers } from "@/lib/tenants";
import { getFollowUps } from "@/lib/tracking";
import { SalesDashboard } from "@/components/sales-dashboard";

// Always render against fresh sheet data (status writes must reflect quickly).
export const dynamic = "force-dynamic";

export default async function SalesPage() {
  let leads;
  try {
    leads = await getAllLeads();
  } catch (err) {
    return (
      <div className="rounded-xl border border-rsg-danger/40 bg-rsg-danger/10 p-6 text-sm text-rsg-danger">
        <p className="font-semibold">Sheet-Daten konnten nicht geladen werden.</p>
        <p className="mt-1 text-rsg-muted">
          {err instanceof Error ? err.message : "Unbekannter Fehler"}
        </p>
        <p className="mt-2 text-rsg-muted2">
          Prüfe GOOGLE_SHEET_ID, Service-Account-Key und die Sheet-Freigabe.
        </p>
      </div>
    );
  }

  const kpis = await getKpis(leads);
  const followUps = await getFollowUps();
  return (
    <SalesDashboard
      leads={leads}
      kpis={kpis}
      users={tenantUsers()}
      followUps={followUps}
    />
  );
}

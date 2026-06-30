import type { Lead, Prio, Status } from "@/lib/types";

/** Sort weight for priority: HOCH first, NIEDRIG last. */
export const PRIO_RANK: Record<Prio, number> = {
  HOCH: 0,
  MITTEL: 1,
  NIEDRIG: 2,
};

/** Sort leads HOCH → MITTEL → NIEDRIG, then by company name. */
export function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const byPrio = PRIO_RANK[a.lead_prio] - PRIO_RANK[b.lead_prio];
    if (byPrio !== 0) return byPrio;
    return a.firma.localeCompare(b.firma, "de");
  });
}

/** Tailwind text/border/bg accents per priority. */
export function prioClasses(prio: Prio): string {
  switch (prio) {
    case "HOCH":
      return "border-rsg-danger/40 bg-rsg-danger/10 text-rsg-danger";
    case "MITTEL":
      return "border-rsg-warn/40 bg-rsg-warn/10 text-rsg-warn";
    case "NIEDRIG":
      return "border-rsg-ok/40 bg-rsg-ok/10 text-rsg-ok";
  }
}

/** Tailwind accent color per status pill. */
export function statusClasses(status: Status, active: boolean): string {
  const base = "border-rsg-border bg-rsg-surface2 text-rsg-muted";
  if (!active) return base;
  switch (status) {
    case "Gewonnen":
      return "border-rsg-ok/50 bg-rsg-ok/15 text-rsg-ok";
    case "Verloren":
      return "border-rsg-danger/50 bg-rsg-danger/15 text-rsg-danger";
    case "Termin":
    case "Angebot":
      return "border-rsg-accent/50 bg-rsg-accent/15 text-rsg-accent";
    default:
      return "border-rsg-text/30 bg-rsg-text/10 text-rsg-text";
  }
}

/** Best-effort region extraction from a German address string. */
export function extractRegion(adresse: string): string {
  if (!adresse) return "";
  // Take the segment after the last comma (usually "PLZ Stadt").
  const tail = adresse.includes(",")
    ? adresse.slice(adresse.lastIndexOf(",") + 1)
    : adresse;
  // Strip a leading postal code, keep the city name.
  return tail.replace(/\b\d{4,5}\b/g, "").trim();
}

/** City / Ort from a German address (segment carrying the postal code). */
export function extractOrt(adresse: string): string {
  if (!adresse) return "";
  const parts = adresse
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Prefer the segment that contains a 4–5 digit postal code ("55116 Mainz").
  const withPlz = parts.find((p) => /\b\d{4,5}\b/.test(p));
  const seg = withPlz ?? parts[parts.length - 1] ?? "";
  // Drop the postal code and any country suffix, keep the city.
  return seg
    .replace(/\b\d{4,5}\b/g, "")
    .replace(/\b(deutschland|germany|österreich|schweiz)\b/gi, "")
    .trim();
}

/** 5-digit German postal code from an address, or "". */
export function extractPlz(adresse: string): string {
  const m = (adresse || "").match(/\b(\d{5})\b/);
  return m ? m[1] : "";
}

/** Postal-code prefixes counted as "home turf" (Mainz/Wiesbaden/Rhein-Main). */
const LOCAL_PLZ_PREFIXES = ["55", "65", "60", "61", "63"];

/** Home-turf lead ("Heimvorteil") — Mainz/Wiesbaden + Rhein-Main area. */
export function isLocalRegion(adresse: string): boolean {
  const plz = extractPlz(adresse);
  if (plz && LOCAL_PLZ_PREFIXES.includes(plz.slice(0, 2))) return true;
  return /\b(mainz|wiesbaden)\b/i.test(adresse || "");
}

/** Format an integer EUR amount as "9.999 €" (de-DE). */
export function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

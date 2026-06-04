import { google, type sheets_v4 } from "googleapis";
import { activeTenant } from "@/lib/tenants";
import type { JaNein, Kpis, Lead, Prio, Status } from "@/lib/types";

/**
 * Service-account auth via JWT — credentials come purely from env vars,
 * no service-account JSON file on disk. GOOGLE_PRIVATE_KEY is stored with
 * escaped "\n" newlines and unescaped here.
 */
const getAuth = () =>
  new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

const getSheets = (): sheets_v4.Sheets =>
  google.sheets({ version: "v4", auth: getAuth() });

// ── parsing helpers ───────────────────────────────────────────

/** Parse a sheet cell into a number, tolerating German "4,5" decimals. */
function toNumber(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function toJaNein(value: unknown): JaNein {
  return String(value ?? "").trim().toLowerCase() === "ja" ? "Ja" : "Nein";
}

function toPrio(value: unknown): Prio {
  const v = String(value ?? "").trim().toUpperCase();
  if (v === "HOCH" || v === "MITTEL" || v === "NIEDRIG") return v;
  return "NIEDRIG";
}

function toStatus(value: unknown): Status {
  const v = String(value ?? "").trim();
  const valid: Status[] = [
    "Neu",
    "Kontaktiert",
    "Termin",
    "Angebot",
    "Gewonnen",
    "Verloren",
  ];
  return (valid.find((s) => s.toLowerCase() === v.toLowerCase()) ??
    "Neu") as Status;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function rowToLead(row: unknown[]): Lead {
  return {
    datum: str(row[0]), // A
    firma: str(row[1]), // B
    branche: str(row[2]), // C
    domain: str(row[3]), // D
    shop_system: str(row[4]), // E
    telefon: str(row[5]), // F
    adresse: str(row[6]), // G
    google_rating: toNumber(row[7]), // H
    reviews: toNumber(row[8]), // I
    seo_score: toNumber(row[9]), // J
    money_kw_top10: toJaNein(row[10]), // K
    niche_kw_top10: toJaNein(row[11]), // L
    geo_sichtbar: toJaNein(row[12]), // M
    sichtbarkeit: str(row[13]), // N
    baustellen: str(row[14]), // O
    sales_pitch: str(row[15]), // P
    lead_prio: toPrio(row[16]), // Q
    status: toStatus(row[17]), // R
  };
}

// ── tab resolution ────────────────────────────────────────────

/**
 * Resolve the actual sheet-tab title to use. Prefers the configured
 * `sheetTab`, but if the spreadsheet doesn't contain a tab by that name
 * we fall back to the first tab — so a renamed tab never breaks the read.
 */
async function resolveTab(sheets: sheets_v4.Sheets): Promise<string> {
  const tenant = activeTenant();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: tenant.sheetId,
    fields: "sheets.properties.title",
  });
  const titles =
    meta.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)) ?? [];
  if (titles.includes(tenant.sheetTab)) return tenant.sheetTab;
  return titles[0] ?? tenant.sheetTab;
}

// ── reads ─────────────────────────────────────────────────────

export async function getAllLeads(): Promise<Lead[]> {
  const tenant = activeTenant();
  const sheets = getSheets();
  const tab = await resolveTab(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: tenant.sheetId,
    range: `${tab}!A2:R`,
  });
  const rows = res.data.values ?? [];
  return rows
    .filter((row) => str(row[3]) !== "") // skip rows without a domain (key)
    .map(rowToLead);
}

// ── writes ────────────────────────────────────────────────────

export async function updateLeadStatus(
  domain: string,
  status: Status,
): Promise<void> {
  const tenant = activeTenant();
  const sheets = getSheets();
  const tab = await resolveTab(sheets);
  const needle = domain.trim().toLowerCase();

  // 1. Read column D (domains). Data starts at row 2.
  const domainRange = `${tab}!${tenant.domainColumn}2:${tenant.domainColumn}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: tenant.sheetId,
    range: domainRange,
  });
  const domains = res.data.values ?? [];

  // 2. Find row index by case-insensitive domain match.
  const offset = domains.findIndex(
    (row) => str(row[0]).toLowerCase() === needle,
  );
  if (offset === -1) {
    const err = new Error(`Lead not found for domain "${domain}"`);
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  const rowIndex = offset + 2; // account for header + 0-based offset

  // 3. Write the new status into column R of that row.
  await sheets.spreadsheets.values.update({
    spreadsheetId: tenant.sheetId,
    range: `${tab}!${tenant.statusColumn}${rowIndex}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });
}

// ── KPIs ──────────────────────────────────────────────────────

/** True if a sheet date string refers to today (ISO or German DD.MM.YYYY). */
function isToday(datum: string): boolean {
  if (!datum) return false;
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const de = `${String(now.getDate()).padStart(2, "0")}.${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}.${now.getFullYear()}`;
  const d = datum.trim();
  return d === iso || d === de || d.startsWith(iso);
}

export async function getKpis(leads: Lead[]): Promise<Kpis> {
  const tenant = activeTenant();
  const termine = leads.filter((l) => l.status === "Termin").length;
  return {
    today_new: leads.filter((l) => isToday(l.datum)).length,
    hoch_open: leads.filter((l) => l.lead_prio === "HOCH" && l.status === "Neu")
      .length,
    termine,
    pipeline_value_eur: termine * tenant.pipelineValuePerTermin,
  };
}

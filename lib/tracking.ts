import { google, type sheets_v4 } from "googleapis";
import { activeTenant } from "@/lib/tenants";

// New, separate log tabs — the RSG_Staging_Leads tab is never touched here.
const LOGIN_TAB = "LoginLog";
const ACTIVITY_TAB = "ActivityLog";
const CALL_TAB = "CallLog";

function sheetsClient(): sheets_v4.Sheets {
  return google.sheets({
    version: "v4",
    auth: new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  });
}

function berlinYMD(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Monday (YYYY-MM-DD) of the current Berlin week. */
function weekStartYMD(): string {
  const [y, m, d] = berlinYMD().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const diff = (dt.getUTCDay() + 6) % 7; // days since Monday
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10);
}

async function ensureTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  header: string[],
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const titles =
    meta.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)) ?? [];
  if (titles.includes(title)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:${String.fromCharCode(64 + header.length)}1`,
    valueInputOption: "RAW",
    requestBody: { values: [header] },
  });
}

/** Record a successful login (LoginLog). Best-effort; never throws to the caller. */
export async function logLogin(email?: string | null): Promise<void> {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return;
  try {
    const sheets = sheetsClient();
    const id = activeTenant().sheetId;
    await ensureTab(sheets, id, LOGIN_TAB, ["timestamp", "email", "type"]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: `${LOGIN_TAB}!A2:C`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[new Date().toISOString(), e, "login"]] },
    });
  } catch {
    /* logging is best-effort */
  }
}

/** Record a lead status change (ActivityLog). Best-effort; never throws. */
export async function logActivity(
  email: string | null | undefined,
  domain: string,
  status: string,
): Promise<void> {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return;
  try {
    const sheets = sheetsClient();
    const id = activeTenant().sheetId;
    await ensureTab(sheets, id, ACTIVITY_TAB, [
      "timestamp",
      "email",
      "domain",
      "status",
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: id,
      range: `${ACTIVITY_TAB}!A2:D`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [[new Date().toISOString(), e, domain, status]],
      },
    });
  } catch {
    /* best-effort */
  }
}

export interface UserWeekStats {
  logins: number;
  activeDays: number;
  lastLogin: string; // ISO timestamp or ""
  callsWeek: number;
  leadsWorkedWeek: number; // distinct leads moved
  statusChangesWeek: number;
}

async function readRange(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return (res.data.values ?? []) as string[][];
  } catch {
    return [];
  }
}

/** Per-user activity stats for the current Berlin week (Mon..today). */
export async function getWeeklyStats(): Promise<{
  weekStart: string;
  today: string;
  byUser: Record<string, UserWeekStats>;
}> {
  const today = berlinYMD();
  const weekStart = weekStartYMD();
  const inWeek = (ymd: string) => ymd >= weekStart && ymd <= today;
  const byUser: Record<string, UserWeekStats> = {};
  const ensure = (e: string): UserWeekStats =>
    (byUser[e] ??= {
      logins: 0,
      activeDays: 0,
      lastLogin: "",
      callsWeek: 0,
      leadsWorkedWeek: 0,
      statusChangesWeek: 0,
    });

  try {
    const sheets = sheetsClient();
    const id = activeTenant().sheetId;
    const [logins, activity, calls] = await Promise.all([
      readRange(sheets, id, `${LOGIN_TAB}!A2:C`),
      readRange(sheets, id, `${ACTIVITY_TAB}!A2:D`),
      readRange(sheets, id, `${CALL_TAB}!A2:D`),
    ]);

    const activeDates: Record<string, Set<string>> = {};
    const markActive = (e: string, ymd: string) => {
      (activeDates[e] ??= new Set()).add(ymd);
    };

    // LoginLog: [timestamp, email, type]
    for (const r of logins) {
      const ts = String(r[0] ?? "");
      const e = String(r[1] ?? "").trim().toLowerCase();
      if (!e || !ts) continue;
      const ymd = ts.slice(0, 10);
      const u = ensure(e);
      if (ts > u.lastLogin) u.lastLogin = ts; // latest overall
      if (inWeek(ymd)) {
        u.logins += 1;
        markActive(e, ymd);
      }
    }

    // ActivityLog: [timestamp, email, domain, status]
    const weekDomains: Record<string, Set<string>> = {};
    for (const r of activity) {
      const ts = String(r[0] ?? "");
      const e = String(r[1] ?? "").trim().toLowerCase();
      const domain = String(r[2] ?? "").trim().toLowerCase();
      if (!e || !ts) continue;
      const ymd = ts.slice(0, 10);
      if (!inWeek(ymd)) continue;
      const u = ensure(e);
      u.statusChangesWeek += 1;
      markActive(e, ymd);
      if (domain) (weekDomains[e] ??= new Set()).add(domain);
    }
    for (const [e, set] of Object.entries(weekDomains)) {
      ensure(e).leadsWorkedWeek = set.size;
    }

    // CallLog: [datum(YYYY-MM-DD), rep, count, updated_at]
    for (const r of calls) {
      const ymd = String(r[0] ?? "").trim();
      const e = String(r[1] ?? "").trim().toLowerCase();
      const count = Math.max(0, parseInt(String(r[2] ?? "0"), 10) || 0);
      if (!e || !ymd || !inWeek(ymd)) continue;
      const u = ensure(e);
      u.callsWeek += count;
      if (count > 0) markActive(e, ymd);
    }

    for (const [e, set] of Object.entries(activeDates)) {
      ensure(e).activeDays = set.size;
    }
  } catch {
    /* return whatever we have */
  }

  return { weekStart, today, byUser };
}

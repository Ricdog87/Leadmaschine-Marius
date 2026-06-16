import { NextResponse } from "next/server";
import { google, type sheets_v4 } from "googleapis";
import { auth } from "@/auth";
import { activeTenant } from "@/lib/tenants";

// Sheets writes must be immediate; never cache.
export const dynamic = "force-dynamic";

const CALL_TAB = "CallLog";
const GOAL = 15;

const getSheets = (): sheets_v4.Sheets =>
  google.sheets({
    version: "v4",
    auth: new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    }),
  });

/** Today's date in Europe/Berlin as YYYY-MM-DD (correct around midnight). */
function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface Rep {
  email: string;
  count: number;
}
interface Stats {
  date: string;
  goal: number;
  reps: Rep[];
}

/** Create the CallLog tab + header on first use if it doesn't exist yet. */
async function ensureTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<void> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const titles =
    meta.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)) ?? [];
  if (titles.includes(CALL_TAB)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: CALL_TAB } } }],
    },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CALL_TAB}!A1:D1`,
    valueInputOption: "RAW",
    requestBody: { values: [["datum", "rep", "count", "updated_at"]] },
  });
}

async function readStats(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<Stats> {
  const today = berlinToday();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CALL_TAB}!A2:D`,
  });
  const rows = res.data.values ?? [];
  const reps: Rep[] = rows
    .filter((r) => String(r[0] ?? "").trim() === today)
    .map((r) => ({
      email: String(r[1] ?? "").trim().toLowerCase(),
      count: Math.max(0, parseInt(String(r[2] ?? "0"), 10) || 0),
    }))
    .filter((r) => r.email);
  return { date: today, goal: GOAL, reps };
}

export async function GET() {
  const session = await auth();
  const me = session?.user?.email?.toLowerCase();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const sheets = getSheets();
    const tenant = activeTenant();
    await ensureTab(sheets, tenant.sheetId);
    const stats = await readStats(sheets, tenant.sheetId);
    return NextResponse.json({ ...stats, me });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sheet error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const me = session?.user?.email?.toLowerCase();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let delta = 1;
  let reset = false;
  try {
    const body = await req.json();
    if (body?.reset === true) reset = true;
    else if (typeof body?.delta === "number") delta = body.delta;
  } catch {
    /* default +1 */
  }
  if (!reset) delta = delta >= 0 ? 1 : -1; // only ±1 per request

  try {
    const sheets = getSheets();
    const tenant = activeTenant();
    await ensureTab(sheets, tenant.sheetId);
    const today = berlinToday();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: tenant.sheetId,
      range: `${CALL_TAB}!A2:D`,
    });
    const rows = res.data.values ?? [];
    const offset = rows.findIndex(
      (r) =>
        String(r[0] ?? "").trim() === today &&
        String(r[1] ?? "").trim().toLowerCase() === me,
    );
    const now = new Date().toISOString();

    if (reset) {
      // Reset only the logged-in rep's own row for today to 0.
      // No matching row -> no-op (never create a row, never touch other reps).
      if (offset !== -1) {
        const rowIndex = offset + 2;
        await sheets.spreadsheets.values.update({
          spreadsheetId: tenant.sheetId,
          range: `${CALL_TAB}!C${rowIndex}:D${rowIndex}`,
          valueInputOption: "RAW",
          requestBody: { values: [[0, now]] },
        });
      }
    } else if (offset === -1) {
      const start = Math.max(0, delta);
      if (start > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: tenant.sheetId,
          range: `${CALL_TAB}!A2:D`,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: [[today, me, start, now]] },
        });
      }
    } else {
      const cur = Math.max(0, parseInt(String(rows[offset][2] ?? "0"), 10) || 0);
      const next = Math.max(0, cur + delta);
      const rowIndex = offset + 2;
      await sheets.spreadsheets.values.update({
        spreadsheetId: tenant.sheetId,
        range: `${CALL_TAB}!C${rowIndex}:D${rowIndex}`,
        valueInputOption: "RAW",
        requestBody: { values: [[next, now]] },
      });
    }

    const stats = await readStats(sheets, tenant.sheetId);
    return NextResponse.json({ ...stats, me });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "sheet error" },
      { status: 500 },
    );
  }
}

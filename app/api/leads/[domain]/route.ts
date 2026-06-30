import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { updateLeadStatus } from "@/lib/sheets";
import { logActivity, setFollowUp } from "@/lib/tracking";
import { STATUSES, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/leads/[domain]">,
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = (body as { status?: unknown })?.status;
  if (!isStatus(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 },
    );
  }

  try {
    const dom = decodeURIComponent(domain);
    await updateLeadStatus(dom, status);
    // Activity audit log (who moved which lead, when) — best-effort.
    await logActivity(session.user.email, dom, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { status?: number }).status === 404 ? 404 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: code },
    );
  }
}

/** Set or clear a Wiedervorlage (follow-up date) for a lead. */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/leads/[domain]">,
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as { wiedervorlage?: unknown })?.wiedervorlage;
  const noteRaw = (body as { note?: unknown })?.note;
  const date = typeof raw === "string" ? raw.trim() : "";
  // Allow empty (= clear) or a strict YYYY-MM-DD date.
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const dom = decodeURIComponent(domain);
    await setFollowUp(
      session.user.email,
      dom,
      date,
      typeof noteRaw === "string" ? noteRaw : "",
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { updateLeadStatus } from "@/lib/sheets";
import {
  logActivity,
  setFollowUp,
  setNote,
  logLeadCall,
} from "@/lib/tracking";
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

/** Per-lead mutations: Anruf-Log ({call:true}), Notiz ({notiz}), or Wiedervorlage ({wiedervorlage}). */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/leads/[domain]">,
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain } = await ctx.params;
  const email = session.user.email;
  const dom = decodeURIComponent(domain);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as {
    call?: unknown;
    notiz?: unknown;
    wiedervorlage?: unknown;
    note?: unknown;
  };

  try {
    if (b.call === true) {
      await logLeadCall(email, dom);
    } else if (typeof b.notiz === "string") {
      await setNote(email, dom, b.notiz);
    } else {
      const date =
        typeof b.wiedervorlage === "string" ? b.wiedervorlage.trim() : "";
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      await setFollowUp(email, dom, date, typeof b.note === "string" ? b.note : "");
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

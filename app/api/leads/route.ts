import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllLeads, getKpis } from "@/lib/sheets";

// Auth-gated and backed by live sheet data — never statically cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await getAllLeads();
    const kpis = await getKpis(leads);
    return NextResponse.json({ leads, kpis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sheet read failed" },
      { status: 500 },
    );
  }
}

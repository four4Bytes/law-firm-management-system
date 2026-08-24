import { NextRequest, NextResponse } from "next/server";

import { getRequiredEnvVar } from "@/lib/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const secret = getRequiredEnvVar("CRON_SECRET");

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runStorageGc } = await import("@/features/documents/mutations");
    const removed = await runStorageGc();
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    console.error("Storage GC cron job failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

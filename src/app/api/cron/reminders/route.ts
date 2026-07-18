import { NextRequest, NextResponse } from "next/server";

import { getRequiredEnvVar } from "@/lib/env";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const secret = getRequiredEnvVar("CRON_SECRET");

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runReminderCheck } = await import("@/features/reminders/scheduler");
    await runReminderCheck();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reminder cron job failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    await prisma.user.update({
      where: { id: session.id },
      data: { last_seen_at: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.name === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

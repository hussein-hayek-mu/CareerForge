import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      database: "connected"
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        database: "unavailable"
      },
      { status: 503 }
    );
  }
}
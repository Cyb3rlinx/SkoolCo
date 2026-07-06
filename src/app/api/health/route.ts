import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/health — liveness + DB readiness. No auth. */
export async function GET() {
  let db: "ok" | "down" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "down";
  }
  return NextResponse.json(
    { status: db === "ok" ? "ok" : "degraded", db },
    { status: db === "ok" ? 200 : 503 }
  );
}

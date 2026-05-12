import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const incidents = await prisma.incident.findMany({
    include: { application: true, incidentType: true },
    orderBy: { updatedAt: "desc" }
  });
  return NextResponse.json({ incidents });
}

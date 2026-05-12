import { NextResponse } from "next/server";
import { sendIncidentStage } from "@/lib/incidents";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await sendIncidentStage(id, "resolved");
  return NextResponse.json({ incident });
}

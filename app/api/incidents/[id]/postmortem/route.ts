import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const postMortemSchema = z.object({
  severity:            z.string().max(50).optional(),
  impact:              z.string().max(5000).optional(),
  timeline:            z.string().max(5000).optional(),
  rootCause:           z.string().max(5000).optional(),
  contributingFactors: z.string().max(5000).optional(),
  lessonsLearned:      z.string().max(5000).optional(),
  actionItems:         z.string().max(5000).optional(),
  authorName:          z.string().max(100).optional(),
  publishedAt:         z.string().datetime().optional().nullable()
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pm = await prisma.postMortem.findUnique({ where: { incidentId: id } });
  if (!pm) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, postMortem: pm });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const data = postMortemSchema.parse(body);

    const pm = await prisma.postMortem.upsert({
      where: { incidentId: id },
      update: { ...data, publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined },
      create: { incidentId: id, ...data, publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined }
    });

    return NextResponse.json({ ok: true, postMortem: pm });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to save post-mortem." }, { status: 500 });
  }
}

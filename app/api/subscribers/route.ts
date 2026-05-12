import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().max(100).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name } = subscribeSchema.parse(body);

    const existing = await prisma.statusPageSubscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ ok: false, error: "This email is already subscribed." }, { status: 409 });
      }
      await prisma.statusPageSubscriber.update({
        where: { email },
        data: { isActive: true, name: name ?? existing.name, unsubscribedAt: null }
      });
      return NextResponse.json({ ok: true, message: "Subscription reactivated." });
    }

    await prisma.statusPageSubscriber.create({
      data: { email, name, isActive: true }
    });

    return NextResponse.json({ ok: true, message: "Subscribed successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    await prisma.statusPageSubscriber.update({
      where: { email },
      data: { isActive: false, unsubscribedAt: new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Subscriber not found." }, { status: 404 });
  }
}

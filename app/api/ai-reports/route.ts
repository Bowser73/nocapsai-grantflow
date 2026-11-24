import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let b;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    typeof b.sectionId !== "string" ||
    b.sectionId.length > 100 ||
    !["offensive", "unsafe", "inaccurate", "other"].includes(b.reason) ||
    typeof b.note !== "string" ||
    b.note.length > 2000
  )
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  const section = await prisma.grantApplicationSection.findFirst({
    where: {
      id: b.sectionId,
      application: {
        organization: {
          OR: [
            { createdByUserId: session.user.id },
            { users: { some: { id: session.user.id } } },
          ],
        },
      },
    },
    select: { id: true, content: true },
  });
  if (!section)
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  const count = await prisma.aIContentReport.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: new Date(Date.now() - 3600000) },
    },
  });
  if (count >= 10)
    return NextResponse.json(
      { error: "Please wait before sending another report" },
      { status: 429 },
    );
  await prisma.aIContentReport.create({
    data: {
      userId: session.user.id,
      sectionId: section.id,
      reason: b.reason,
      note: b.note,
      contentSnapshot: section.content || "",
    },
  });
  return NextResponse.json({ received: true });
}

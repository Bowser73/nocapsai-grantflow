import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const SwitchSchema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = SwitchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { organizationId } = parsed.data;

  // Verify this user actually has access to the requested org
  const org = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      OR: [
        { users: { some: { id: session.user.id } } },
        { createdByUserId: session.user.id },
      ],
    },
    select: { id: true, name: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Update the user's active org — JWT callback re-reads this on next auth() call
  await prisma.user.update({
    where: { id: session.user.id },
    data: { organizationId },
  });

  return NextResponse.json({ success: true, organization: org });
}

/**
 * POST /api/onboarding/link-org
 *
 * Links a user with no active organization to an existing organization.
 * Unlike /api/profile/switch, this route does NOT require prior membership —
 * it is only callable when the user currently has organizationId = null.
 *
 * Security model:
 * - User must be authenticated
 * - User must currently have no organizationId (prevents hijacking)
 * - The target org must exist
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const Schema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Re-read the user from DB to get the current organizationId
  // (session token may be cached)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Safety gate: only allow this route when the user has no org.
  // Once linked, they must use /api/profile/switch to change orgs.
  if (dbUser.organizationId) {
    return NextResponse.json(
      { error: "Account is already linked to an organization. Use profile switcher to change." },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { organizationId } = parsed.data;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Link the user — User.organizationId FK means they now appear in org.users
  await prisma.user.update({
    where: { id: session.user.id },
    data: { organizationId: org.id },
  });

  return NextResponse.json({ success: true, organization: org });
}
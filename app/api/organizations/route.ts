import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const CreateOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  orgType: z.string().min(1, "Organization type is required"),
  missionStatement: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
  switchToNew: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, orgType, missionStatement, website, city, state, switchToNew } =
    parsed.data;

  // Create the new org, linking it to this user as creator
  const org = await prisma.organization.create({
    data: {
      name,
      orgType: orgType as any, // validated as OrgType enum value by caller
      missionStatement: missionStatement || null,
      website: website || null,
      city: city || null,
      state: state || null,
      createdByUserId: session.user.id,
    },
    select: { id: true, name: true },
  });

  // Optionally switch the user to this new org immediately
  if (switchToNew) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { organizationId: org.id },
    });
  }

  return NextResponse.json({ success: true, data: org }, { status: 201 });
}

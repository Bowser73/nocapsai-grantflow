/**
 * Organization Profile API
 * POST — Create new organization and link to user
 * PUT  — Update existing organization
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { computeProfileCompleteness } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  userId: z.string(),
  name: z.string().min(2).max(200),
  ein: z.string().optional().nullable(),
  orgType: z.string(),
  nonprofitStatus: z.string().optional().nullable(),
  missionStatement: z.string().optional().nullable(),
  visionStatement: z.string().optional().nullable(),
  programsServices: z.string().optional().nullable(),
  geographicArea: z.string().optional().nullable(),
  targetPopulation: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  annualBudget: z.number().optional().nullable(),
  fiscalYearEnd: z.string().optional().nullable(),
  hasAudit: z.boolean().optional(),
  pastGrantsNarrative: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const profileCompleteness = computeProfileCompleteness(data as Record<string, unknown>);

    const { userId, ...orgData } = data;

    const org = await prisma.organization.create({
      data: {
        ...orgData,
        orgType: data.orgType as never,
        profileCompleteness,
        users: { connect: { id: data.userId } },
      },
    });

    // Link user to org
    await prisma.user.update({
      where: { id: data.userId },
      data: { organizationId: org.id },
    });

    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error) {
    console.error("Create org error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input.", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const profileCompleteness = computeProfileCompleteness(data as Record<string, unknown>);

    const { userId, ...orgData } = data;

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data: {
        ...orgData,
        orgType: data.orgType as never,
        profileCompleteness,
      },
    });

    return NextResponse.json({ success: true, data: org });
  } catch (error) {
    console.error("Update org error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}



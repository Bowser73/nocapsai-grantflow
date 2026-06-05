/**
 * Create a new Grant Application from an opportunity.
 * Called when user clicks "Start Application" on the Grant Detail page.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const formData = await req.formData();
  const opportunityId = formData.get("opportunityId") as string;

  if (!opportunityId) {
    return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
  }

  // Check if already exists
  const existing = await prisma.grantApplication.findFirst({
    where: { organizationId: session.user.organizationId, opportunityId },
  });

  if (existing) {
    return NextResponse.redirect(new URL(`/grants/${existing.id}/apply`, req.url));
  }

  const opportunity = await prisma.grantOpportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  // Create application
  const application = await prisma.grantApplication.create({
    data: {
      organizationId: session.user.organizationId,
      opportunityId,
      status: "DRAFTING",
      deadline: opportunity.deadline,
      submissionMethod: opportunity.submissionMethod,
    },
  });

  // Log initial status update
  await prisma.grantStatusUpdate.create({
    data: {
      applicationId: application.id,
      toStatus: "DRAFTING",
      note: "Application created",
      changedBy: session.user.id,
    },
  });

  return NextResponse.redirect(new URL(`/grants/${application.id}/apply`, req.url));
}

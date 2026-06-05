/**
 * PATCH /api/grants/applications/[appId]/status
 * Update application status and log the status change.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import type { ApplicationStatus } from "@prisma/client";

const VALID_STATUSES: ApplicationStatus[] = [
  "DRAFTING",
  "NEEDS_REVIEW",
  "READY_TO_SUBMIT",
  "SUBMITTED",
  "FOLLOW_UP_NEEDED",
  "AWARDED",
  "DENIED",
  "REPORTING_REQUIRED",
  "CLOSED",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId } = params;
  const { status, note } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  // Verify ownership
  const application = await prisma.grantApplication.findUnique({
    where: { id: appId },
    select: { organizationId: true, status: true },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fromStatus = application.status;

  // Update status + set submittedAt if transitioning to SUBMITTED
  const updateData: Record<string, unknown> = { status };
  if (status === "SUBMITTED" && fromStatus !== "SUBMITTED") {
    updateData.submittedAt = new Date();
  }

  await prisma.grantApplication.update({
    where: { id: appId },
    data: updateData as Parameters<typeof prisma.grantApplication.update>[0]["data"],
  });

  // Log status change
  await prisma.grantStatusUpdate.create({
    data: {
      applicationId: appId,
      fromStatus,
      toStatus: status as ApplicationStatus,
      note: note ?? null,
      changedBy: session.user.id ?? "user",
    },
  });

  return NextResponse.json({ success: true, status });
}

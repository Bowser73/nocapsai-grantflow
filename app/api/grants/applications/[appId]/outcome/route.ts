/**
 * PATCH /api/grants/applications/[appId]/outcome
 *
 * Update post-submission outcome fields:
 * decisionStatus, decisionDate, awardAmount, contractStatus,
 * fundsReceivedStatus, reportDueDate, followUpDate, notes.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import type { ApplicationStatus } from "@prisma/client";

const BodySchema = z.object({
  decisionStatus:    z.enum([
    "NOT_SUBMITTED", "SUBMITTED_WAITING", "FOLLOW_UP_NEEDED",
    "AWARDED", "DECLINED", "WAITLISTED", "REPORTING_DUE", "CLOSED",
  ]).optional(),
  decisionDate:      z.string().datetime().optional().nullable(),
  awardAmount:       z.number().positive().optional().nullable(),
  contractStatus:    z.enum(["NOT_STARTED", "PENDING", "SIGNED", "NOT_REQUIRED"]).optional().nullable(),
  fundsReceivedStatus: z.enum(["NOT_RECEIVED", "PARTIAL", "RECEIVED", "NOT_APPLICABLE"]).optional().nullable(),
  reportDueDate:     z.string().datetime().optional().nullable(),
  followUpDate:      z.string().datetime().optional().nullable(),
  notes:             z.string().optional(),
});

const DECISION_TO_APP_STATUS: Partial<Record<string, ApplicationStatus>> = {
  AWARDED:          "AWARDED",
  DECLINED:         "DENIED",
  FOLLOW_UP_NEEDED: "FOLLOW_UP_NEEDED",
  REPORTING_DUE:    "REPORTING_REQUIRED",
  CLOSED:           "CLOSED",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const app = await prisma.grantApplication.findUnique({
    where: { id: params.appId },
    select: { organizationId: true, status: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    decisionStatus,
    decisionDate,
    awardAmount,
    contractStatus,
    fundsReceivedStatus,
    reportDueDate,
    followUpDate,
    notes,
  } = parsed.data;

  // Mirror decision status onto ApplicationStatus where it maps cleanly
  const newAppStatus = decisionStatus
    ? (DECISION_TO_APP_STATUS[decisionStatus] ?? undefined)
    : undefined;

  const updated = await prisma.grantApplication.update({
    where: { id: params.appId },
    data: {
      decisionStatus:     decisionStatus  ?? undefined,
      decisionDate:       decisionDate    !== undefined ? (decisionDate ? new Date(decisionDate) : null) : undefined,
      awardAmount:        awardAmount     !== undefined ? awardAmount : undefined,
      contractStatus:     contractStatus  !== undefined ? contractStatus : undefined,
      fundsReceivedStatus: fundsReceivedStatus !== undefined ? fundsReceivedStatus : undefined,
      reportDueDate:      reportDueDate   !== undefined ? (reportDueDate ? new Date(reportDueDate) : null) : undefined,
      followUpDate:       followUpDate    !== undefined ? (followUpDate ? new Date(followUpDate) : null) : undefined,
      notes:              notes           !== undefined ? notes : undefined,
      status:             newAppStatus,
    },
  });

  // Log status transition if ApplicationStatus changed
  if (newAppStatus && newAppStatus !== app.status) {
    await prisma.grantStatusUpdate.create({
      data: {
        applicationId: params.appId,
        fromStatus:    app.status,
        toStatus:      newAppStatus,
        note:          `Decision: ${decisionStatus}`,
        changedBy:     session.user.id ?? "user",
      },
    });
  }

  return NextResponse.json({ success: true, data: updated });
}

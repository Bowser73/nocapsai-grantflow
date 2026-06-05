/**
 * PATCH /api/grants/applications/[appId]/timeline
 *
 * Mark an application as submitted and record the decision window.
 * Also accepts direct updates to followUpDate, expectedDecisionStart/End.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { calcDecisionWindow } from "@/lib/grant-timeline";
import type { GrantType } from "@/lib/grant-timeline";

const BodySchema = z.object({
  submittedAt:          z.string().datetime().optional(),
  grantType:            z.enum(["LOCAL", "CORPORATE", "STATE", "FEDERAL", "CUSTOM"]).optional(),
  expectedDecisionStart: z.string().datetime().optional().nullable(),
  expectedDecisionEnd:   z.string().datetime().optional().nullable(),
  followUpDate:          z.string().datetime().optional().nullable(),
  notes:                 z.string().optional(),
});

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

  const {
    submittedAt,
    grantType,
    expectedDecisionStart,
    expectedDecisionEnd,
    followUpDate,
    notes,
  } = parsed.data;

  // Verify ownership
  const app = await prisma.grantApplication.findUnique({
    where: { id: params.appId },
    select: { organizationId: true, status: true, submittedAt: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (app.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submittedDate = submittedAt ? new Date(submittedAt) : (app.submittedAt ?? new Date());

  // Auto-calculate decision window if grant type provided and window not manually set
  let winStart: Date | null = expectedDecisionStart ? new Date(expectedDecisionStart) : null;
  let winEnd:   Date | null = expectedDecisionEnd   ? new Date(expectedDecisionEnd)   : null;
  let followUp: Date | null = followUpDate           ? new Date(followUpDate)          : null;

  if (grantType && grantType !== "CUSTOM" && !winStart && !winEnd) {
    const win = calcDecisionWindow(submittedDate, grantType as Exclude<GrantType, "CUSTOM">);
    winStart  = win.start;
    winEnd    = win.end;
    followUp  = followUp ?? win.followUpDate;
  }

  const updated = await prisma.grantApplication.update({
    where: { id: params.appId },
    data: {
      submittedAt:           submittedDate,
      grantType:             grantType ?? undefined,
      decisionStatus:        "SUBMITTED_WAITING",
      expectedDecisionStart: winStart,
      expectedDecisionEnd:   winEnd,
      followUpDate:          followUp,
      notes:                 notes !== undefined ? notes : undefined,
      // Advance ApplicationStatus if still in draft states
      status: ["DRAFTING", "NEEDS_REVIEW", "READY_TO_SUBMIT"].includes(app.status)
        ? "SUBMITTED"
        : undefined,
    },
  });

  // Log status change if we advanced it
  if (["DRAFTING", "NEEDS_REVIEW", "READY_TO_SUBMIT"].includes(app.status)) {
    await prisma.grantStatusUpdate.create({
      data: {
        applicationId: params.appId,
        fromStatus:    app.status,
        toStatus:      "SUBMITTED",
        note:          "Marked as submitted via Timeline Tracker",
        changedBy:     session.user.id ?? "user",
      },
    });
  }

  return NextResponse.json({ success: true, data: updated });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";
import type { SubmissionMethod } from "@prisma/client";

const BodySchema = z.object({
  confirmationNumber: z.string().trim().min(1, "Confirmation number/note is required"),
  submittedBy: z.string().trim().min(1, "Submitted by is required"),
  submittedAt: z.string().datetime(),
});

export async function POST(
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
    select: {
      id: true,
      organizationId: true,
      status: true,
      submissionMethod: true,
      submissionNotes: true,
    },
  });

  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (app.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const submittedAt = new Date(parsed.data.submittedAt);
  const method: SubmissionMethod = app.submissionMethod ?? "MANUAL";
  const notesLine = `Submission confirmation: ${parsed.data.confirmationNumber} (submitted by ${parsed.data.submittedBy} on ${submittedAt.toISOString()})`;
  const mergedSubmissionNotes = app.submissionNotes
    ? `${app.submissionNotes}\n\n${notesLine}`
    : notesLine;

  await prisma.$transaction(async (tx) => {
    await tx.grantApplication.update({
      where: { id: app.id },
      data: {
        status: "SUBMITTED",
        submittedAt,
        submissionNotes: mergedSubmissionNotes,
      },
    });

    await tx.grantSubmission.upsert({
      where: { applicationId: app.id },
      create: {
        applicationId: app.id,
        method,
        submittedAt,
        confirmationNumber: parsed.data.confirmationNumber,
        submittedByUserId: session.user.id ?? null,
        submittedVia: parsed.data.submittedBy,
        isConfirmedByUser: true,
        notes: notesLine,
      },
      update: {
        method,
        submittedAt,
        confirmationNumber: parsed.data.confirmationNumber,
        submittedByUserId: session.user.id ?? null,
        submittedVia: parsed.data.submittedBy,
        isConfirmedByUser: true,
        notes: notesLine,
      },
    });

    if (app.status !== "SUBMITTED") {
      await tx.grantStatusUpdate.create({
        data: {
          applicationId: app.id,
          fromStatus: app.status,
          toStatus: "SUBMITTED",
          note: `Marked as submitted with confirmation: ${parsed.data.confirmationNumber}`,
          changedBy: session.user.id ?? "user",
        },
      });
    }
  });

  return NextResponse.json({ success: true });
}

/**
 * POST /api/grants/applications/[appId]/sections/[sectionId]/approve
 * Toggle approved status for a section.
 * Body: { approved: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { appId: string; sectionId: string } }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, sectionId } = params;
  const body = await req.json();
  const approved = Boolean(body.approved);

  // Verify ownership
  const section = await prisma.grantApplicationSection.findUnique({
    where: { id: sectionId },
    include: { application: { select: { organizationId: true } } },
  });

  if (!section || section.applicationId !== appId) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }
  if (section.application.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!section.content && approved) {
    return NextResponse.json({ error: "Cannot approve empty section" }, { status: 400 });
  }

  await prisma.grantApplicationSection.update({
    where: { id: sectionId },
    data: {
      isApproved: approved,
      lastEditedBy: session.user.id,
    },
  });

  // If all sections are approved, bump status to NEEDS_REVIEW
  if (approved) {
    const allSections = await prisma.grantApplicationSection.findMany({
      where: { applicationId: appId },
      select: { isApproved: true },
    });
    const allApproved = allSections.every((s) => s.isApproved);
    if (allApproved && allSections.length > 0) {
      const app = await prisma.grantApplication.findUnique({
        where: { id: appId },
        select: { status: true },
      });
      if (app?.status === "DRAFTING") {
        await prisma.grantApplication.update({
          where: { id: appId },
          data: { status: "NEEDS_REVIEW" },
        });
        await prisma.grantStatusUpdate.create({
          data: {
            applicationId: appId,
            fromStatus: "DRAFTING",
            toStatus: "NEEDS_REVIEW",
            note: "All sections approved — ready for review",
            changedBy: "system",
          },
        });
      }
    }
  }

  return NextResponse.json({ success: true, approved });
}

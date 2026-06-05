/**
 * PATCH /api/grants/applications/[appId]/sections/[sectionId]
 * Inline-edit: save manually edited section content.
 * Resets isApproved when content changes.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { appId: string; sectionId: string } }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId, sectionId } = params;
  const { content } = await req.json();

  if (typeof content !== "string") {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

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
  if (section.isLocked) {
    return NextResponse.json({ error: "Section is locked" }, { status: 409 });
  }

  // Save previous version before overwriting
  const versions = (section.versions as object[]) ?? [];
  if (section.content) {
    versions.push({
      content: section.content,
      editedAt: new Date().toISOString(),
      editedBy: session.user.id ?? "user",
      source: "manual",
    });
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const updated = await prisma.grantApplicationSection.update({
    where: { id: sectionId },
    data: {
      content,
      wordCount,
      versions,
      isApproved: false, // Always reset approval on manual edit
      lastEditedBy: session.user.id,
    },
  });

  return NextResponse.json({ success: true, wordCount: updated.wordCount });
}

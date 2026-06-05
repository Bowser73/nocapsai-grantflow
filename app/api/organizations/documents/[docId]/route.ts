import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { docId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.organizationDocument.findUnique({
    where: { id: params.docId },
    select: { id: true, fileUrl: true, organizationId: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.organizationDocument.delete({ where: { id: params.docId } });

  // Delete local file — TODO: delete from S3 in production
  try {
    const filePath = path.join(process.cwd(), "public", doc.fileUrl);
    await unlink(filePath);
  } catch { /* ok */ }

  return NextResponse.json({ success: true });
}

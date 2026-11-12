import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { docId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.organizationDocument.findUnique({
    where: { id: params.docId },
    select: { id: true, organizationId: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // The stored file (DocumentBlob) is removed with the record (ON DELETE CASCADE).
  await prisma.organizationDocument.delete({ where: { id: params.docId } });

  return NextResponse.json({ success: true });
}

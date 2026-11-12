/**
 * Document download
 * GET — Returns the stored file for a document in the caller's active organization.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { contentDisposition, contentTypeFor } from "@/lib/storage/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { docId: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.organizationDocument.findUnique({
    where: { id: params.docId },
    select: { organizationId: true, fileName: true, blob: { select: { data: true } } },
  });

  // Same response for "does not exist" and "not yours", so ids cannot be probed.
  if (!doc || doc.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!doc.blob) {
    return NextResponse.json(
      { error: "This file was uploaded before permanent storage was set up and is no longer available. Please upload it again." },
      { status: 410 }
    );
  }

  // Serve with the type implied by the extension, never a stored/browser-supplied one.
  const mimeType = contentTypeFor(doc.fileName) ?? "application/octet-stream";
  const body = new Uint8Array(doc.blob.data);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": contentDisposition(doc.fileName, mimeType),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

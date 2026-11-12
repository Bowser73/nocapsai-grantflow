/**
 * Document Upload API
 * POST — Upload one or more documents for the caller's active organization.
 *
 * File contents are stored in the database (DocumentBlob), so uploads persist
 * on serverless hosts. See lib/storage/documents.ts for the size and type rules.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { DocumentType } from "@prisma/client";
import { contentTypeFor, documentFileUrl, validateUpload } from "@/lib/storage/documents";

export const runtime = "nodejs";

// Document type → human display name
const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  IRS_DETERMINATION_LETTER:  "IRS Determination Letter",
  ARTICLES_OF_INCORPORATION: "Articles of Incorporation",
  BYLAWS:                    "Bylaws",
  FINANCIAL_STATEMENTS:      "Financial Statements",
  AUDIT_REPORT:              "Audit Report",
  BUDGET:                    "Budget",
  BOARD_LIST:                "Board Member List",
  STAFF_RESUMES:             "Staff Resumes",
  ANNUAL_REPORT:             "Annual Report",
  PROJECT_PLAN:              "Project Plan",
  LOGIC_MODEL:               "Logic Model",
  LETTER_OF_SUPPORT:         "Letter of Support",
  PROOF_OF_IMPACT:           "Proof of Impact",
  PHOTO_VIDEO:               "Photo / Video",
  FLYER_MARKETING:           "Flyer / Marketing",
  OTHER:                     "Document",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const organizationId = formData.get("organizationId") as string;
    const docType = formData.get("docType") as DocumentType;
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (!organizationId || !docType || !files.length) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    if (!(docType in DOC_TYPE_LABELS)) {
      return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
    }

    // Documents can only be added to the caller's active organization.
    if (organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate everything before storing anything.
    for (const file of files) {
      const problem = validateUpload(file.name, file.size);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    }

    const created = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = contentTypeFor(file.name)!;

      const doc = await prisma.$transaction(async (tx) => {
        const row = await tx.organizationDocument.create({
          data: {
            organizationId,
            type: docType,
            name: DOC_TYPE_LABELS[docType],
            fileName: file.name,
            fileUrl: "pending",
            fileSize: buffer.length,
            mimeType,
            status: "ACTIVE",
            blob: { create: { data: buffer } },
          },
        });
        return tx.organizationDocument.update({
          where: { id: row.id },
          data: { fileUrl: documentFileUrl(row.id) },
        });
      });
      created.push(doc);
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

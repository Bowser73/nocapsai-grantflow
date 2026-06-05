/**
 * Document Upload API
 * POST — Upload one or more documents for an organization
 *
 * In development: files are stored in /public/uploads/<orgId>/
 * In production: swap the writeFileToDisk function for S3 upload.
 * See lib/services/file-storage.ts for the production hook.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { DocumentType } from "@prisma/client";

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
    const files = formData.getAll("files") as File[];

    if (!organizationId || !docType || !files.length) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Dev: write to public/uploads — replace with S3 in prod
    const uploadDir = path.join(process.cwd(), "public", "uploads", organizationId);
    await mkdir(uploadDir, { recursive: true });

    const created = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${Date.now()}_${safeName}`;
      const filePath = path.join(uploadDir, fileName);

      // TODO [PRODUCTION]: Replace this with S3 upload:
      // const fileUrl = await uploadToS3(buffer, fileName, file.type);
      await writeFile(filePath, buffer);
      const fileUrl = `/uploads/${organizationId}/${fileName}`;

      const doc = await prisma.organizationDocument.create({
        data: {
          organizationId,
          type: docType,
          name: DOC_TYPE_LABELS[docType],
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
          status: "ACTIVE",
        },
      });
      created.push(doc);
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

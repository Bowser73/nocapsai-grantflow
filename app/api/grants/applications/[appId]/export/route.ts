/**
 * GET /api/grants/applications/[appId]/export
 * Export all grant application sections as a formatted .docx file.
 * Uses the `docx` npm package to produce a proper Word document.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Header,
  Footer,
  BorderStyle,
} from "docx";
import { GRANT_SECTION_ORDER, GRANT_SECTION_LABELS } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { appId } = params;

  // Load application, org, and sections
  const application = await prisma.grantApplication.findUnique({
    where: { id: appId },
    include: {
      organization: {
        select: { name: true, ein: true, city: true, state: true },
      },
      opportunity: {
        select: { title: true, funder: true, deadline: true, awardMax: true },
      },
      sections: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (application.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build a map of sectionType → content for ordered rendering
  const sectionMap = new Map(
    application.sections.map((s) => [s.sectionType, s])
  );

  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const deadline = application.opportunity.deadline
    ? new Date(application.opportunity.deadline).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "See grant guidelines";

  // ── Helpers ──────────────────────────────────────────────────────────────

  function heading1(text: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 160 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "4F46E5", space: 6 },
      },
      children: [
        new TextRun({
          text,
          bold: true,
          size: 28,
          font: "Arial",
          color: "1E1B4B",
        }),
      ],
    });
  }

  function heading2(text: string): Paragraph {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      children: [
        new TextRun({
          text,
          bold: true,
          size: 24,
          font: "Arial",
          color: "312E81",
        }),
      ],
    });
  }

  function body(text: string): Paragraph[] {
    // Split on newlines, emit one Paragraph per non-empty line
    const lines = text.split("\n");
    const paragraphs: Paragraph[] = [];
    for (const line of lines) {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: line,
              size: 22,
              font: "Arial",
              color: "374151",
            }),
          ],
        })
      );
    }
    return paragraphs;
  }

  function metaRow(label: string, value: string): Paragraph {
    return new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20, font: "Arial", color: "374151" }),
        new TextRun({ text: value, size: 20, font: "Arial", color: "6B7280" }),
      ],
    });
  }

  function spacer(): Paragraph {
    return new Paragraph({ spacing: { after: 240 }, children: [] });
  }

  // ── Build document content ────────────────────────────────────────────────

  const children: Paragraph[] = [];

  // Title block
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "GRANT APPLICATION",
          bold: true,
          size: 36,
          font: "Arial",
          color: "1E1B4B",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: "4F46E5", space: 6 },
      },
      children: [
        new TextRun({
          text: application.opportunity.title,
          size: 26,
          font: "Arial",
          color: "4338CA",
          italics: true,
        }),
      ],
    })
  );

  // Application metadata
  children.push(
    heading1("Application Overview"),
    metaRow("Organization", application.organization.name),
    ...(application.organization.ein
      ? [metaRow("EIN", application.organization.ein)]
      : []),
    ...(application.organization.city && application.organization.state
      ? [metaRow("Location", `${application.organization.city}, ${application.organization.state}`)]
      : []),
    metaRow("Funder", application.opportunity.funder),
    metaRow("Deadline", deadline),
    ...(application.requestedAmount
      ? [metaRow("Amount Requested", `$${application.requestedAmount.toLocaleString()}`)]
      : application.opportunity.awardMax
      ? [metaRow("Award Range", `Up to $${application.opportunity.awardMax.toLocaleString()}`)]
      : []),
    metaRow("Prepared", exportDate),
    spacer()
  );

  // All 11 sections in canonical order
  for (const sectionType of GRANT_SECTION_ORDER) {
    const section = sectionMap.get(sectionType);
    const label =
      GRANT_SECTION_LABELS[sectionType as keyof typeof GRANT_SECTION_LABELS] ??
      sectionType;

    children.push(heading2(label));

    if (section?.content) {
      children.push(...body(section.content));
    } else {
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: "[This section has not been generated yet]",
              italics: true,
              color: "9CA3AF",
              size: 20,
              font: "Arial",
            }),
          ],
        })
      );
    }

    children.push(spacer());
  }

  // ── Assemble document ─────────────────────────────────────────────────────

  const safeFileName = application.organization.name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 } },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: {
            spacing: { before: 400, after: 160 },
            outlineLevel: 0,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Arial" },
          paragraph: {
            spacing: { before: 320, after: 120 },
            outlineLevel: 1,
          },
        },
      ],
    },

    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${application.organization.name}  ·  ${application.opportunity.title}`,
                    size: 16,
                    font: "Arial",
                    color: "9CA3AF",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Page ",
                    size: 16,
                    font: "Arial",
                    color: "9CA3AF",
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    font: "Arial",
                    color: "9CA3AF",
                  }),
                  new TextRun({
                    text: "  ·  Prepared by GrantFlow AI  ·  ",
                    size: 16,
                    font: "Arial",
                    color: "9CA3AF",
                  }),
                  new TextRun({
                    text: exportDate,
                    size: 16,
                    font: "Arial",
                    color: "9CA3AF",
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeFileName}-grant-application.docx"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}

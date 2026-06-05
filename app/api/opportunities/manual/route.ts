/**
 * Manual Opportunity API
 * POST — Create a user-verified grant opportunity (not from Grants.gov or seed data).
 *
 * dataQuality is set to USER_ADDED (MANUAL_REVIEW does not exist in the schema enum).
 * originSource is set to "MANUAL" (string field — no schema change required).
 * submissionMethod defaults to ONLINE_PORTAL.
 * isActive defaults to true.
 *
 * sourceUrl is required and must be a valid URL.
 * Do not allow unsourced grant opportunities.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

// ── Validation schema ─────────────────────────────────────────────────────────

const manualOpportunitySchema = z.object({
  // Required
  title:       z.string().min(2).max(300),
  funder:      z.string().min(2).max(200),
  description: z.string().min(10),
  category:    z.string().min(1).max(100),
  sourceUrl:   z.string().url({ message: "sourceUrl must be a valid URL (include https://)" }),

  // Optional
  focusAreas:          z.array(z.string()).optional().default([]),
  eligibility:         z.string().optional().nullable(),
  locationRestriction: z.string().optional().nullable(),
  locationStates:      z.array(z.string()).optional().default([]),
  awardMin:            z.number().positive().optional().nullable(),
  awardMax:            z.number().positive().optional().nullable(),
  deadline:            z.string().optional().nullable(), // ISO date string from form
  isRolling:           z.boolean().optional().default(false),
  applicationUrl:      z.string().url().optional().nullable().or(z.literal("")),
  requirements:        z.string().optional().nullable(),
  requiredDocuments:   z.array(z.string()).optional().default([]),
  notes:               z.string().optional().nullable(), // saved to requirements field
});

type ManualOpportunityInput = z.infer<typeof manualOpportunitySchema>;

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate
  const parsed = manualOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: ManualOpportunityInput = parsed.data;

  // Coerce empty applicationUrl to null
  const applicationUrl =
    data.applicationUrl && data.applicationUrl.trim() !== ""
      ? data.applicationUrl
      : null;

  // Parse deadline
  let deadline: Date | null = null;
  if (data.deadline && data.deadline.trim() !== "") {
    const parsed = new Date(data.deadline);
    if (!isNaN(parsed.getTime())) {
      deadline = parsed;
    }
  }

  // Merge notes into requirements
  const requirements = [data.requirements, data.notes]
    .filter(Boolean)
    .join("\n\n")
    .trim() || null;

  try {
    const opportunity = await prisma.grantOpportunity.create({
      data: {
        title:               data.title.trim(),
        funder:              data.funder.trim(),
        description:         data.description.trim(),
        category:            data.category.trim(),
        focusAreas:          data.focusAreas,
        eligibility:         data.eligibility ?? null,
        locationRestriction: data.locationRestriction ?? null,
        locationStates:      data.locationStates,
        awardMin:            data.awardMin ?? null,
        awardMax:            data.awardMax ?? null,
        deadline,
        isRolling:           data.isRolling,
        applicationUrl,
        sourceUrl:           data.sourceUrl.trim(),
        requirements,
        requiredDocuments:   data.requiredDocuments,

        // Controlled defaults — not exposed to user
        isActive:         true,
        originSource:     "MANUAL",
        dataQuality:      "USER_ADDED",
        submissionMethod: "ONLINE_PORTAL",
      },
    });

    return NextResponse.json(
      { success: true, data: { id: opportunity.id, title: opportunity.title } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[manual-opportunity] create error:", error);
    return NextResponse.json({ error: "Failed to save opportunity." }, { status: 500 });
  }
}

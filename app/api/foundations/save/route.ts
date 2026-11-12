/**
 * POST /api/foundations/save — save a foundation as a funding prospect.
 *
 * Creates (or reuses) a GrantOpportunity for the foundation so it can be
 * evaluated, tracked, and drafted like any other opportunity. Only facts from
 * the IRS record are stored; anything the IRS file does not say (deadlines,
 * whether unsolicited proposals are accepted) is flagged for the user to verify.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { formatBigMoney, formatTaxPeriod, KIND_LABELS, US_STATES, type FoundationKind } from "@/lib/foundations/bmf";
import { filingsUrl } from "@/lib/foundations/search";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/auth/login", req.url), 303);
  }

  const form = await req.formData();
  const ein = String(form.get("ein") ?? "");
  if (!/^\d{9}$/.test(ein)) return NextResponse.json({ error: "Invalid EIN" }, { status: 400 });

  const f = await prisma.foundation.findUnique({ where: { ein } });
  if (!f) return NextResponse.json({ error: "Foundation not found" }, { status: 404 });

  const kindLabel = KIND_LABELS[f.kind as FoundationKind] ?? "Foundation";
  const place = [f.city, f.state].filter(Boolean).join(", ");
  const period = formatTaxPeriod(f.taxPeriod);
  const formattedEin = `${ein.slice(0, 2)}-${ein.slice(2)}`;

  const description = [
    `${f.name} is a ${kindLabel.toLowerCase()}${place ? ` based in ${place}` : ""} (EIN ${formattedEin}).`,
    f.assets !== null
      ? `Its most recent IRS return on file${period ? ` (period ending ${period})` : ""} reports total assets of ${formatBigMoney(f.assets)}${f.income !== null ? ` and income of ${formatBigMoney(f.income)}` : ""}.`
      : "No asset figure is on file with the IRS for this organization.",
    "This record comes from the IRS Exempt Organizations Business Master File. It shows that the funder exists and how large it is; it does not show what the funder is currently funding.",
    "[VERIFY: funding priorities and geographic focus]",
    "[VERIFY: whether unsolicited proposals are accepted]",
    "[VERIFY: application deadlines and process]",
  ].join("\n\n");

  const sourceUrl = filingsUrl(ein);
  const externalId = `EIN:${ein}`;
  const data = {
    title: `${f.name} — funding prospect`,
    funder: f.name,
    description,
    category: "Foundation",
    focusAreas: [] as string[],
    eligibility: "[VERIFY: eligibility with the funder — not stated in IRS records]",
    locationRestriction: f.state ? `Based in ${US_STATES[f.state] ?? f.state} — confirm where it funds` : null,
    locationStates: f.state ? [f.state] : [],
    isRolling: false,
    sourceUrl,
    dataQuality: "VERIFIED" as const,     // organization facts are from the official IRS file
    lastVerified: f.sourceUpdatedAt,
    originSource: "IRS_BMF",
    submissionMethod: "MANUAL" as const,
  };

  const opp = await prisma.grantOpportunity.upsert({
    where: { externalId },
    update: { description: data.description, lastVerified: data.lastVerified },
    create: { ...data, externalId },
    select: { id: true },
  });

  return NextResponse.redirect(new URL(`/grants/${opp.id}`, req.url), 303);
}

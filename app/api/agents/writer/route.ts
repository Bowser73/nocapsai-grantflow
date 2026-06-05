/**
 * Grant Writer Agent API endpoint
 * Called from the Application Workspace when user clicks "Generate All Sections"
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { runWriterAgentAllSections } from "@/lib/agents/writer-agent";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  const formData = await req.formData();
  const applicationId = formData.get("applicationId") as string;

  if (!applicationId) {
    return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  }

  // Run all writer agent sections
  // In production, this should be queued as a background job (pg-boss / BullMQ)
  // so the HTTP request doesn't time out on large generations
  // TODO [PRODUCTION]: Replace with: await enqueueJob("writer-all-sections", { applicationId, ... })
  const { results, errors } = await runWriterAgentAllSections({
    applicationId,
    organizationId: session.user.organizationId,
    triggeredById: session.user.id,
  });

  if (errors.length > 0) {
    console.error("Writer agent errors:", errors);
  }

  return NextResponse.redirect(new URL(`/grants/${applicationId}/apply`, req.url));
}

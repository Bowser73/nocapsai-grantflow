import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { OrgProfileForm } from "@/components/profile/org-profile-form";
import { OrgDocumentsPanel } from "@/components/profile/org-documents-panel";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Organization Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  let org = null;
  let documents: Awaited<ReturnType<typeof prisma.organizationDocument.findMany>> = [];

  if (session.user.organizationId) {
    [org, documents] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.user.organizationId },
      }),
      prisma.organizationDocument.findMany({
        where: { organizationId: session.user.organizationId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
  }

  return (
    <div>
      <Topbar title="Organization Profile" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Completeness bar */}
        {org && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <Progress
              value={org.profileCompleteness}
              label="Profile completeness"
              showPercent
            />
            {org.profileCompleteness < 80 && (
              <p className="text-xs text-gray-400 mt-1.5">
                Fill out all sections to improve your grant match accuracy.
              </p>
            )}
          </div>
        )}

        {/* No-org notice */}
        {!org && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start justify-between gap-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">Joining an existing organization?</span>{" "}
              If your organization is already in GrantFlow, link your account instead of creating a new profile.
            </p>
            <a
              href="/onboarding"
              className="shrink-0 text-sm font-semibold text-amber-800 underline hover:text-amber-900"
            >
              Link account →
            </a>
          </div>
        )}

        {/* Profile form */}
        <OrgProfileForm org={org} userId={session.user.id} />

        {/* Documents panel */}
        {org && (
          <OrgDocumentsPanel
            organizationId={org.id}
            documents={documents}
          />
        )}
      </div>
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { OrgLinker } from "@/components/onboarding/org-linker";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Set Up Your Account" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // If user already has an org, they don't need onboarding
  if (session.user.organizationId) {
    redirect("/dashboard");
  }

  // Load all organizations in the system so the user can select one
  const allOrgs = await prisma.organization.findMany({
    select: { id: true, name: true, orgType: true, city: true, state: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Topbar title="Set Up Your Account" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-xl mx-auto mt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Connect your organization
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Link your account to an existing organization or create a new one to get started.
          </p>
        </div>

        {allOrgs.length === 0 ? (
          /* No orgs exist yet — direct to profile creation */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              No organizations exist yet. Create your organization profile to get started.
            </p>
            <Link href="/profile">
              <Button icon={<Plus size={15} />}>Create Organization Profile</Button>
            </Link>
          </div>
        ) : (
          /* One or more orgs exist — let user select */
          <OrgLinker orgs={allOrgs} userId={session.user.id} />
        )}
      </div>
    </div>
  );
}
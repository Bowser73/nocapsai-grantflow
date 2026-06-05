import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { FundingScoutView } from "@/components/funding-scout/funding-scout-view";
import type { OrgProfileSnapshot } from "@/lib/funding-scout";
import { Radar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Funding Scout" };

export default async function FundingScoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Load org profile
  let org: OrgProfileSnapshot | null = null;

  if (session.user.organizationId) {
    const dbOrg = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        name: true,
        orgType: true,
        missionStatement: true,
        programsServices: true,
        targetPopulation: true,
        geographicArea: true,
        city: true,
        state: true,
        annualBudget: true,
        profileCompleteness: true,
        pastGrantsNarrative: true,
      },
    });

    if (dbOrg) {
      org = {
        name: dbOrg.name,
        orgType: dbOrg.orgType as string,
        missionStatement: dbOrg.missionStatement,
        programsServices: dbOrg.programsServices,
        targetPopulation: dbOrg.targetPopulation,
        geographicArea: dbOrg.geographicArea,
        city: dbOrg.city,
        state: dbOrg.state,
        annualBudget: dbOrg.annualBudget,
        profileCompleteness: dbOrg.profileCompleteness,
        pastGrantsNarrative: dbOrg.pastGrantsNarrative,
      };
    }
  }

  return (
    <div>
      <Topbar title="Funding Scout" userName={session.user.name ?? undefined} />

      {org ? (
        <FundingScoutView org={org} />
      ) : (
        /* ── No org profile yet ─────────────────────────────────────────── */
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center py-16 gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
              <Radar className="w-7 h-7 text-brand-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">
                Set up your organization profile first
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-md">
                Funding Scout analyzes your mission statement, programs, location, and target
                population to generate a tailored grant strategy. Complete your profile to
                get started.
              </p>
            </div>
            <Link href="/profile">
              <Button size="lg" icon={<Radar size={17} />}>
                Go to Organization Profile
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

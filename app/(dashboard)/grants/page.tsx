import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDeadline, getDeadlineUrgency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { FolderOpen, Plus, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Applications" };

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/dashboard");

  const orgId = session.user.organizationId;

  const applications = await prisma.grantApplication.findMany({
    where: { organizationId: orgId },
    include: {
      opportunity: {
        select: { title: true, funder: true, awardMin: true, awardMax: true },
      },
      sections: {
        select: { id: true, isApproved: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const statusGroups = {
    active: applications.filter((a) =>
      ["DRAFTING", "NEEDS_REVIEW", "READY_TO_SUBMIT"].includes(a.status)
    ),
    submitted: applications.filter((a) =>
      ["SUBMITTED", "FOLLOW_UP_NEEDED"].includes(a.status)
    ),
    closed: applications.filter((a) =>
      ["AWARDED", "DENIED", "REPORTING_REQUIRED", "CLOSED"].includes(a.status)
    ),
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Topbar
        title="Applications"
        userName={session.user.name ?? undefined}
        actions={
          <Link href="/search">
            <Button icon={<Plus size={15} />} size="sm">
              New Application
            </Button>
          </Link>
        }
      />

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Find a grant and start your first application. GrantFlow AI will help write every section.
          </p>
          <Link href="/search">
            <Button icon={<Plus size={16} />}>Browse Grants</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* ── Active ──────────────────────────────────────────────────────── */}
          {statusGroups.active.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                In Progress ({statusGroups.active.length})
              </h2>
              <div className="space-y-3">
                {statusGroups.active.map((app) => (
                  <ApplicationRow key={app.id} app={app} />
                ))}
              </div>
            </section>
          )}

          {/* ── Submitted ───────────────────────────────────────────────────── */}
          {statusGroups.submitted.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Submitted ({statusGroups.submitted.length})
              </h2>
              <div className="space-y-3">
                {statusGroups.submitted.map((app) => (
                  <ApplicationRow key={app.id} app={app} />
                ))}
              </div>
            </section>
          )}

          {/* ── Closed ──────────────────────────────────────────────────────── */}
          {statusGroups.closed.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Closed ({statusGroups.closed.length})
              </h2>
              <div className="space-y-3">
                {statusGroups.closed.map((app) => (
                  <ApplicationRow key={app.id} app={app} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ── Row component ──────────────────────────────────────────────────────────────

type AppWithRelations = Awaited<
  ReturnType<typeof prisma.grantApplication.findMany>
>[number] & {
  opportunity: { title: string; funder: string; awardMin: number | null; awardMax: number | null };
  sections: { id: string; isApproved: boolean }[];
};

function ApplicationRow({ app }: { app: AppWithRelations }) {
  const urgency = app.deadline ? getDeadlineUrgency(app.deadline) : "ok";
  const deadlineLabel = app.deadline ? formatDeadline(app.deadline) : "No deadline";
  const approvedSections = app.sections.filter((s) => s.isApproved).length;
  const totalSections = app.sections.length;

  const awardRange =
    app.opportunity.awardMin && app.opportunity.awardMax
      ? `${formatCurrency(app.opportunity.awardMin)} – ${formatCurrency(app.opportunity.awardMax)}`
      : app.opportunity.awardMin
      ? `from ${formatCurrency(app.opportunity.awardMin)}`
      : null;

  return (
    <Link href={`/grants/${app.id}/apply`}>
      <Card
        hover
        padding="md"
        className="group flex items-center gap-4"
      >
        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-1">
            <StatusBadge status={app.status} />
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate mt-1.5">
            {app.opportunity.title}
          </p>
          <p className="text-xs text-gray-500 truncate">{app.opportunity.funder}</p>
        </div>

        {/* Sections progress */}
        {totalSections > 0 && (
          <div className="hidden sm:flex flex-col items-center gap-1 w-24 shrink-0">
            <p className="text-xs text-gray-500">
              {approvedSections}/{totalSections} sections
            </p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${totalSections ? (approvedSections / totalSections) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Award range */}
        {awardRange && (
          <div className="hidden md:block text-right shrink-0 w-36">
            <p className="text-xs text-gray-400">Award</p>
            <p className="text-sm font-medium text-gray-700">{awardRange}</p>
          </div>
        )}

        {/* Deadline */}
        <div className="text-right shrink-0 w-32">
          <div className="flex items-center justify-end gap-1">
            <Clock
              size={12}
              className={cn(
                urgency === "overdue" && "text-red-400",
                urgency === "urgent" && "text-amber-400",
                urgency === "soon" && "text-yellow-400",
                urgency === "ok" && "text-gray-300"
              )}
            />
            <p
              className={cn(
                "text-xs font-medium",
                urgency === "overdue" && "text-red-600",
                urgency === "urgent" && "text-amber-600",
                urgency === "soon" && "text-yellow-600",
                urgency === "ok" && "text-gray-500"
              )}
            >
              {deadlineLabel}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={16}
          className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0"
        />
      </Card>
    </Link>
  );
}

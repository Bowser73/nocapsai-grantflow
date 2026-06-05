import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusSelector } from "@/components/workspace/status-selector";
import { ExportButton } from "@/components/workspace/export-button";
import { TimelineCard } from "@/components/workspace/timeline-card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { GRANT_SECTION_ORDER, GRANT_SECTION_LABELS } from "@/types";
import {
  CheckCircle, Circle, Sparkles, ChevronRight, Clock,
} from "lucide-react";

export const metadata = { title: "Application Workspace" };

export default async function ApplicationWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const application = await prisma.grantApplication.findUnique({
    where: { id: params.id },
    include: {
      opportunity: true,
      organization: { select: { name: true } },
      sections: { orderBy: { sortOrder: "asc" } },
      budget: { include: { lineItems: true } },
      tasks: { where: { status: { not: "COMPLETED" } }, take: 5 },
    },
  });

  if (!application) notFound();
  if (application.organizationId !== session.user.organizationId) {
    redirect("/grants");
  }

  const approvedCount = application.sections.filter((s) => s.isApproved).length;
  const totalSections = GRANT_SECTION_ORDER.length;
  const sectionProgress = Math.round((approvedCount / totalSections) * 100);
  const sectionMap = new Map(application.sections.map((s) => [s.sectionType, s]));

  return (
    <div>
      <Topbar
        title="Application Workspace"
        userName={session.user.name ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusSelector
              applicationId={application.id}
              currentStatus={application.status}
            />
            <ExportButton applicationId={application.id} />
            <Button size="sm" variant="ghost" icon={<Sparkles size={14} />} disabled>
              Compliance
            </Button>
          </div>
        }
      />

      <div className="p-6 grid grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left: Sidebar */}
        <div className="col-span-1 space-y-4">
          <Card>
            <p className="text-xs text-gray-400 mb-1">Grant</p>
            <p className="text-sm font-semibold text-gray-900 mb-0.5">
              {application.opportunity.title}
            </p>
            <p className="text-xs text-gray-500">{application.opportunity.funder}</p>
            {application.deadline && (
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                <Clock size={13} className="text-amber-500" />
                <span className="text-xs text-amber-700 font-medium">
                  Due {formatDate(application.deadline)}
                </span>
              </div>
            )}
            {application.requestedAmount && (
              <p className="text-xs text-gray-500 mt-1">
                Requesting {formatCurrency(application.requestedAmount)}
              </p>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Sections</p>
              <span className="text-xs text-gray-400">
                {approvedCount}/{totalSections} approved
              </span>
            </div>
            <Progress value={sectionProgress} size="sm" showPercent={false} />
            <div className="mt-3 space-y-0.5">
              {GRANT_SECTION_ORDER.map((sectionType) => {
                const section = sectionMap.get(sectionType);
                const hasContent = !!section?.content;
                const isApproved = section?.isApproved ?? false;
                return (
                  <div
                    key={sectionType}
                    className="flex items-center gap-2.5 p-2 rounded-md hover:bg-gray-50 transition-colors group"
                  >
                    {isApproved ? (
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                    ) : hasContent ? (
                      <Circle size={14} className="text-brand-400 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-gray-300 shrink-0" />
                    )}
                    <span
                      className={`text-xs flex-1 ${
                        isApproved ? "text-green-700 font-medium"
                        : hasContent ? "text-brand-700"
                        : "text-gray-400"
                      }`}
                    >
                      {GRANT_SECTION_LABELS[sectionType]}
                    </span>
                    <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-400" />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Timeline / Decision Tracker */}
          <TimelineCard
            applicationId={application.id}
            submittedAt={application.submittedAt}
            deadline={application.deadline}
            grantType={application.grantType}
            decisionStatus={application.decisionStatus}
            decisionDate={application.decisionDate}
            awardAmount={application.awardAmount}
            expectedDecisionStart={application.expectedDecisionStart}
            expectedDecisionEnd={application.expectedDecisionEnd}
            followUpDate={application.followUpDate}
            contractStatus={application.contractStatus}
            fundsReceivedStatus={application.fundsReceivedStatus}
            reportDueDate={application.reportDueDate}
            notes={application.notes}
          />

          {application.tasks.length > 0 && (
            <Card>
              <p className="text-sm font-semibold text-gray-900 mb-3">Open Tasks</p>
              <div className="space-y-2">
                {application.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2">
                    <Circle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-700 text-xs">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Due {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Center: Writing Area */}
        <div className="col-span-2 space-y-4">
          {application.sections.length === 0 && (
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 text-center">
              <Sparkles size={28} className="mx-auto text-brand-500 mb-3" />
              <h3 className="text-base font-semibold text-brand-900 mb-2">
                Ready to write your application
              </h3>
              <p className="text-sm text-brand-700 mb-4 max-w-md mx-auto">
                The Grant Writer Agent generates all 11 narrative sections from your
                organization profile and grant details. Each section can be edited,
                regenerated, and approved individually.
              </p>
              <form action="/api/agents/writer" method="POST">
                <input type="hidden" name="applicationId" value={application.id} />
                <Button type="submit" icon={<Sparkles size={15} />}>
                  Generate All Sections
                </Button>
              </form>
              <p className="text-xs text-brand-500 mt-3">
                Takes ~60–90 seconds for all 11 sections.
              </p>
            </div>
          )}

          {application.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={{
                id: section.id,
                sectionType: section.sectionType,
                content: section.content,
                wordCount: section.wordCount,
                wordLimit: section.wordLimit,
                isApproved: section.isApproved,
              }}
              applicationId={application.id}
              grantTitle={application.opportunity.title}
              funder={application.opportunity.funder}
              orgName={application.organization?.name ?? ""}
            />
          ))}

          {application.sections.length > 0 &&
            application.sections.length < GRANT_SECTION_ORDER.length && (
              <div className="border border-dashed border-brand-300 rounded-xl p-5 text-center bg-brand-50/40">
                <p className="text-sm text-brand-700 font-medium mb-1">
                  {GRANT_SECTION_ORDER.length - application.sections.length} sections not yet generated
                </p>
                <p className="text-xs text-brand-500 mb-3">
                  Generate the remaining sections or use Regenerate on each card.
                </p>
                <form action="/api/agents/writer" method="POST">
                  <input type="hidden" name="applicationId" value={application.id} />
                  <Button type="submit" size="sm" icon={<Sparkles size={14} />}>
                    Generate Missing Sections
                  </Button>
                </form>
              </div>
            )}

          {application.readinessScore != null && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Compliance Readiness</h3>
                <span
                  className={`text-lg font-bold ${
                    application.readinessScore >= 80 ? "text-green-600"
                    : application.readinessScore >= 60 ? "text-amber-600"
                    : "text-red-600"
                  }`}
                >
                  {application.readinessScore}/100
                </span>
              </div>
              <Progress value={application.readinessScore} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
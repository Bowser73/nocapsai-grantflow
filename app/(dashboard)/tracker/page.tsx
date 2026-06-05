import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getTrackerGroup,
  getTimelineWarnings,
  TRACKER_GROUP_META,
  DECISION_STATUS_LABELS,
  DECISION_STATUS_COLORS,
  type TrackerGroup,
  type DecisionStatus,
} from "@/lib/grant-timeline";
import {
  KanbanSquare, AlertCircle, AlertTriangle, Info,
  CheckCircle2, Clock, FileText, TrendingUp,
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Grant Tracker" };

const GROUP_ORDER: TrackerGroup[] = [
  "drafting", "submitted", "followup", "awarded", "declined", "reporting",
];

const GROUP_BORDER: Record<TrackerGroup, string> = {
  drafting:  "border-l-gray-300",
  submitted: "border-l-blue-400",
  followup:  "border-l-amber-400",
  awarded:   "border-l-green-500",
  declined:  "border-l-red-400",
  reporting: "border-l-orange-400",
  closed:    "border-l-gray-200",
};

const GROUP_BG: Record<TrackerGroup, string> = {
  drafting:  "bg-gray-50",
  submitted: "bg-blue-50",
  followup:  "bg-amber-50",
  awarded:   "bg-green-50",
  declined:  "bg-red-50",
  reporting: "bg-orange-50",
  closed:    "bg-gray-50",
};

const SEVERITY_STYLES = {
  error:   "bg-red-50 text-red-700 border border-red-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  info:    "bg-blue-50 text-blue-700 border border-blue-200",
};
const SEVERITY_ICONS = {
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

export default async function TrackerPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/profile");

  const applications = await prisma.grantApplication.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      opportunity: {
        select: { title: true, funder: true, awardMax: true },
      },
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  const grouped = new Map<TrackerGroup, typeof applications>();
  for (const group of [...GROUP_ORDER, "closed" as TrackerGroup]) {
    grouped.set(group, []);
  }
  for (const app of applications) {
    const group = getTrackerGroup(app.status, app.decisionStatus ?? null);
    grouped.get(group)?.push(app);
  }

  const hasAny = applications.length > 0;
  const awardedApps = grouped.get("awarded") ?? [];

  return (
    <div>
      <Topbar title="Grant Tracker" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-7xl mx-auto">
        {!hasAny ? (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <KanbanSquare size={40} className="text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-600">No applications yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              Search for grants and start an application to begin tracking.
            </p>
            <Link href="/search" className="text-sm text-brand-600 hover:underline font-medium">
              Go to Grant Search &rarr;
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
              {GROUP_ORDER.map((group) => {
                const meta = TRACKER_GROUP_META[group];
                const count = grouped.get(group)?.length ?? 0;
                return (
                  <Card key={group} className="text-center py-3 px-2">
                    <p className={`text-2xl font-bold ${meta.color}`}>{count}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium leading-tight">
                      {meta.label}
                    </p>
                  </Card>
                );
              })}
            </div>

            {awardedApps.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">Important:</span> Do not count grant funding as income until both an award notice <em>and</em> a signed agreement have been received.
                </p>
              </div>
            )}
            <div className="space-y-8">
              {GROUP_ORDER.map((group) => {
                const apps = grouped.get(group) ?? [];
                const meta = TRACKER_GROUP_META[group];
                return (
                  <section key={group}>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className={`text-sm font-bold uppercase tracking-wide ${meta.color}`}>
                        {meta.label}
                      </h2>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {apps.length}
                      </span>
                    </div>

                    {apps.length === 0 ? (
                      <p className="text-xs text-gray-400 pl-1">{meta.emptyLabel}</p>
                    ) : (
                      <div className="space-y-2">
                        {apps.map((app) => {
                          const snapshot = {
                            status: app.status,
                            decisionStatus: app.decisionStatus ?? null,
                            submittedAt: app.submittedAt,
                            deadline: app.deadline,
                            followUpDate: app.followUpDate ?? null,
                            expectedDecisionStart: app.expectedDecisionStart ?? null,
                            expectedDecisionEnd: app.expectedDecisionEnd ?? null,
                            reportDueDate: app.reportDueDate ?? null,
                          };
                          const warnings = getTimelineWarnings(snapshot);
                          const ds = (app.decisionStatus ?? null) as DecisionStatus | null;
                          const dsColors = ds ? DECISION_STATUS_COLORS[ds] : null;
                          const dsLabel = ds ? DECISION_STATUS_LABELS[ds] : null;

                          return (
                            <div
                              key={app.id}
                              className={`border-l-4 ${GROUP_BORDER[group]} ${GROUP_BG[group]} rounded-r-xl px-4 py-3`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/grants/${app.id}/apply`}
                                    className="text-sm font-semibold text-gray-900 hover:text-brand-700 transition-colors line-clamp-1"
                                  >
                                    {app.opportunity.title}
                                  </Link>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {app.opportunity.funder}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                  {dsColors && dsLabel && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${dsColors.badge}`}>
                                      {dsLabel}
                                    </span>
                                  )}
                                  {(app.awardAmount || app.requestedAmount || app.opportunity.awardMax) && (
                                    <span className="text-xs font-semibold text-gray-700">
                                      {app.awardAmount
                                        ? formatCurrency(app.awardAmount)
                                        : app.requestedAmount
                                        ? formatCurrency(app.requestedAmount)
                                        : formatCurrency(app.opportunity.awardMax!)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                                {app.deadline && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    Deadline {formatDate(app.deadline)}
                                  </span>
                                )}
                                {app.submittedAt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 size={11} className="text-blue-500" />
                                    Submitted {formatDate(app.submittedAt)}
                                  </span>
                                )}
                                {app.expectedDecisionStart && app.expectedDecisionEnd && (
                                  <span className="flex items-center gap-1">
                                    <TrendingUp size={11} />
                                    Decision: {formatDate(app.expectedDecisionStart)} &ndash; {formatDate(app.expectedDecisionEnd)}
                                  </span>
                                )}
                                {app.reportDueDate && (
                                  <span className="flex items-center gap-1">
                                    <FileText size={11} className="text-orange-500" />
                                    Report due {formatDate(app.reportDueDate)}
                                  </span>
                                )}
                              </div>

                              {warnings.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {warnings.map((w) => {
                                    const Icon = SEVERITY_ICONS[w.severity];
                                    return (
                                      <span
                                        key={w.type}
                                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[w.severity]}`}
                                      >
                                        <Icon size={10} />
                                        {w.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

              {(grouped.get("closed")?.length ?? 0) > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
                      {TRACKER_GROUP_META.closed.label}
                    </h2>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                      {grouped.get("closed")!.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {grouped.get("closed")!.map((app) => (
                      <div
                        key={app.id}
                        className="border-l-4 border-l-gray-200 bg-gray-50 rounded-r-xl px-4 py-3 opacity-60"
                      >
                        <Link
                          href={`/grants/${app.id}/apply`}
                          className="text-sm font-medium text-gray-600 hover:text-brand-700 line-clamp-1"
                        >
                          {app.opportunity.title}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">{app.opportunity.funder}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
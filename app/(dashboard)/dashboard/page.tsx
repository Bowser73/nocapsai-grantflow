import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDeadline, getDeadlineUrgency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Search,
  TrendingUp,
  Clock,
  Award,
  AlertTriangle,
  Plus,
  ArrowRight,
  Building2,
} from "lucide-react";
import Link from "next/link";
import type { ApplicationStatus } from "@prisma/client";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    // No org yet — prompt to create one
    return (
      <div className="p-6">
        <Topbar title="Dashboard" userName={session?.user?.name ?? undefined} />
        <div className="flex flex-col items-center justify-center mt-24 text-center">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-brand-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Set up your organization</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Link your account to your organization so GrantFlow AI can find and personalize grants for you.
          </p>
          <Link href="/onboarding">
            <Button icon={<Plus size={16} />}>Set Up Organization</Button>
          </Link>
        </div>
      </div>
    );
  }

  const orgId = session.user.organizationId;

  // Load dashboard data
  const [org, applications, totalFunding] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, profileCompleteness: true },
    }),
    prisma.grantApplication.findMany({
      where: { organizationId: orgId },
      include: {
        opportunity: { select: { title: true, funder: true } },
      },
      orderBy: { deadline: "asc" },
      take: 10,
    }),
    prisma.grantApplication.aggregate({
      where: {
        organizationId: orgId,
        requestedAmount: { not: null },
        status: { notIn: ["DENIED", "CLOSED"] },
      },
      _sum: { requestedAmount: true },
    }),
  ]);

  // Status counts
  const statusCounts: Partial<Record<ApplicationStatus, number>> = {};
  for (const app of applications) {
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;
  }

  const upcomingDeadlines = applications.filter(
    (a) => a.deadline && getDeadlineUrgency(a.deadline) !== "normal" && getDeadlineUrgency(a.deadline) !== "none"
  );

  const activeGrants = applications.filter(
    (a) => !["DENIED", "CLOSED"].includes(a.status)
  ).length;

  const stats = [
    {
      label: "Active Grants",
      value: activeGrants,
      icon: TrendingUp,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Potential Funding",
      value: formatCurrency(totalFunding._sum.requestedAmount ?? 0),
      icon: Award,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Upcoming Deadlines",
      value: upcomingDeadlines.length,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Needs Attention",
      value: (statusCounts["NEEDS_REVIEW"] ?? 0) + (statusCounts["FOLLOW_UP_NEEDED"] ?? 0),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div>
      <Topbar
        title={`Welcome back${session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}`}
        userName={session.user.name ?? undefined}
        actions={
          <Link href="/search">
            <Button size="sm" icon={<Search size={14} />}>
              Find Grants
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Profile completeness warning */}
        {org && org.profileCompleteness < 80 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Your organization profile is {org.profileCompleteness}% complete
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  A complete profile helps GrantFlow AI find better-matching grants.
                </p>
              </div>
            </div>
            <Link href="/profile">
              <Button variant="secondary" size="sm" iconRight={<ArrowRight size={14} />}>
                Complete Profile
              </Button>
            </Link>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
                  <Icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Main content: recent grants + deadlines */}
        <div className="grid grid-cols-3 gap-6">
          {/* Recent applications */}
          <div className="col-span-2">
            <Card padding="none">
              <CardHeader className="px-5 pt-4 pb-0">
                <CardTitle>Recent Applications</CardTitle>
                <Link href="/tracker" className="text-xs text-brand-600 hover:underline font-medium flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </Link>
              </CardHeader>

              {applications.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Search size={32} className="text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No applications yet</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Search for grants to get started</p>
                  <Link href="/search">
                    <Button size="sm" icon={<Search size={14} />}>Find Grants</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {applications.slice(0, 6).map((app) => {
                    const urgency = getDeadlineUrgency(app.deadline);
                    return (
                      <Link
                        key={app.id}
                        href={`/grants/${app.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {app.opportunity.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {app.opportunity.funder}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {app.deadline && (
                            <span className={cn(
                              "text-xs font-medium",
                              urgency === "overdue" && "text-red-600",
                              urgency === "urgent" && "text-amber-600",
                              urgency === "soon" && "text-amber-500",
                              urgency === "normal" && "text-gray-400",
                            )}>
                              {formatDeadline(app.deadline)}
                            </span>
                          )}
                          <StatusBadge status={app.status} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Profile completeness */}
            <Card>
              <CardHeader className="mb-3">
                <CardTitle>Profile Strength</CardTitle>
                <Link href="/profile" className="text-xs text-brand-600 hover:underline">Edit</Link>
              </CardHeader>
              <Progress value={org?.profileCompleteness ?? 0} label="Completeness" />
              <p className="text-xs text-gray-500 mt-2">
                {(org?.profileCompleteness ?? 0) < 80
                  ? "Complete your profile to improve grant matching accuracy."
                  : "Great! Your profile is well-filled."}
              </p>
            </Card>

            {/* Grant status breakdown */}
            <Card>
              <CardTitle className="mb-3">Status Breakdown</CardTitle>
              {applications.length === 0 ? (
                <p className="text-xs text-gray-400">No applications yet</p>
              ) : (
                <div className="space-y-2">
                  {(Object.entries(statusCounts) as [ApplicationStatus, number][]).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <StatusBadge status={status} />
                      <span className="font-semibold text-gray-700">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

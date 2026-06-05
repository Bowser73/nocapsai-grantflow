import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatDeadline, getDeadlineUrgency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ExternalLink, Calendar, DollarSign, MapPin, FileText,
  CheckCircle, XCircle, AlertCircle, Sparkles, ArrowRight
} from "lucide-react";
import Link from "next/link";

export default async function GrantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const grant = await prisma.grantOpportunity.findUnique({
    where: { id: params.id },
    include: {
      source: true,
      applications: {
        where: { organizationId: session.user.organizationId ?? "" },
        select: { id: true, status: true },
      },
    },
  });

  if (!grant) notFound();

  const existingApp = grant.applications[0];
  const urgency = getDeadlineUrgency(grant.deadline);

  const deadlineColor = {
    overdue: "text-red-600",
    urgent:  "text-amber-600",
    soon:    "text-amber-500",
    normal:  "text-gray-700",
    none:    "text-gray-400",
  }[urgency];

  return (
    <div>
      <Topbar
        title="Grant Detail"
        userName={session.user.name ?? undefined}
        actions={
          existingApp ? (
            <Link href={`/grants/${existingApp.id}/apply`}>
              <Button size="sm" iconRight={<ArrowRight size={14} />}>Open Application</Button>
            </Link>
          ) : (
            <form action="/api/grants/apply" method="POST">
              <input type="hidden" name="opportunityId" value={grant.id} />
              <Button type="submit" size="sm" icon={<Sparkles size={14} />}>
                Start Application
              </Button>
            </form>
          )
        }
      />

      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Header card */}
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="neutral">{grant.category}</Badge>
                {grant.focusAreas.map((tag) => (
                  <Badge key={tag} variant="info" size="sm">{tag}</Badge>
                ))}
                {grant.dataQuality === "UNCERTAIN" && (
                  <Badge variant="warning">⚠ Uncertain data</Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">{grant.title}</h1>
              <p className="text-sm text-gray-500">{grant.funder}</p>
            </div>

            {/* Fit score */}
            {grant.matchScore != null && (
              <div className="shrink-0 text-center bg-brand-50 rounded-xl p-4 min-w-[100px]">
                <p className="text-3xl font-bold text-brand-700">{Math.round(grant.matchScore)}</p>
                <p className="text-xs text-brand-500 font-medium">Fit Score</p>
                <p className="text-[10px] text-brand-400 mt-0.5">out of 100</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700 mt-4 leading-relaxed">{grant.description}</p>

          {/* Source URL — always shown */}
          <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-100">
            <ExternalLink size={13} className="text-gray-400" />
            <span className="text-xs text-gray-400">Source:</span>
            <a
              href={grant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline truncate"
            >
              {grant.sourceUrl}
            </a>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-5">
          {/* Key info */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Grant Details</h2>
            <div className="space-y-3">
              <InfoRow icon={DollarSign} label="Award Amount">
                {grant.awardMin != null || grant.awardMax != null
                  ? `${formatCurrency(grant.awardMin ?? grant.awardMax)} – ${formatCurrency(grant.awardMax ?? grant.awardMin)}`
                  : "Not specified"}
              </InfoRow>
              <InfoRow icon={Calendar} label="Deadline">
                <span className={cn("font-semibold", deadlineColor)}>
                  {grant.isRolling ? "Rolling deadline" : formatDeadline(grant.deadline)}
                </span>
                {!grant.isRolling && grant.deadline && (
                  <span className="text-xs text-gray-400 ml-1">({formatDate(grant.deadline)})</span>
                )}
              </InfoRow>
              <InfoRow icon={MapPin} label="Location">
                {grant.locationRestriction ?? "No restriction specified"}
              </InfoRow>
              <InfoRow icon={FileText} label="Submission method">
                {grant.submissionMethod.replace(/_/g, " ")}
                {grant.portalName && ` (${grant.portalName})`}
              </InfoRow>
              {grant.applicationUrl && (
                <InfoRow icon={ExternalLink} label="Application">
                  <a href={grant.applicationUrl} target="_blank" rel="noopener noreferrer"
                    className="text-brand-600 hover:underline text-sm truncate">
                    Apply here
                  </a>
                </InfoRow>
              )}
            </div>
          </Card>

          {/* Eligibility */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Eligibility</h2>
            {grant.eligibility ? (
              <p className="text-sm text-gray-700 leading-relaxed">{grant.eligibility}</p>
            ) : (
              <p className="text-sm text-gray-400">Eligibility information not available</p>
            )}
            {grant.orgTypesAllowed.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Eligible org types</p>
                <div className="flex flex-wrap gap-1.5">
                  {grant.orgTypesAllowed.map((type) => (
                    <Badge key={type} variant="success" size="sm">
                      {type.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Required documents */}
        {grant.requiredDocuments.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Required Documents</h2>
            <div className="grid grid-cols-2 gap-2">
              {grant.requiredDocuments.map((doc) => (
                <div key={doc} className="flex items-center gap-2 text-sm text-gray-700">
                  <FileText size={14} className="text-gray-400 shrink-0" />
                  {doc}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CTA */}
        {!existingApp && (
          <div className="flex justify-center pt-2">
            <form action="/api/grants/apply" method="POST">
              <input type="hidden" name="opportunityId" value={grant.id} />
              <Button size="lg" icon={<Sparkles size={16} />}>
                Start Application for This Grant
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-800">{children}</div>
      </div>
    </div>
  );
}

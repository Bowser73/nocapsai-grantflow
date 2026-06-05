import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import prisma from "@/lib/db/prisma";
import { Search, ExternalLink, ArrowRight, Info, Zap } from "lucide-react";
import Link from "next/link";
import { GrantSearchBox } from "@/components/search/grant-search-box";

export const metadata = { title: "Grant Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; live?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const query = searchParams.q ?? "";
  const showedLive = searchParams.live === "1";

  const grants = await prisma.grantOpportunity.findMany({
    where: {
      isActive: true,
      ...(query
        ? {
            OR: [
              { title:       { contains: query, mode: "insensitive" } },
              { funder:      { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { category:    { contains: query, mode: "insensitive" } },
              { focusAreas:  { has: query } },
            ],
          }
        : {}),
    },
    orderBy: [
      { matchScore: "desc" },
      { updatedAt: "desc" },
    ],
    take: 40,
    select: {
      id: true,
      title: true,
      funder: true,
      description: true,
      category: true,
      awardMin: true,
      awardMax: true,
      deadline: true,
      matchScore: true,
      dataQuality: true,
      sourceUrl: true,
    },
  });

  return (
    <div>
      <Topbar title="Grant Search" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <GrantSearchBox initialQuery={query} />

        {/* Live search confirmation banner */}
        {showedLive && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
            <Zap size={15} className="shrink-0 text-amber-500" />
            <span>
              Live results fetched from <strong>Grants.gov</strong> and merged with your library.
              Results marked <strong>Live</strong> are from the federal database.
            </span>
          </div>
        )}

        {/* Data quality notice */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-md px-4 py-3 text-sm text-blue-800">
          <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
          <span>
            Every grant result includes a verified source URL. Grant data labeled{" "}
            <strong>Uncertain</strong> was unavailable at time of fetch — always verify
            deadlines and eligibility at the source before applying.
          </span>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {query ? `Results for "${query}"` : "Available Grants"}
              <span className="text-gray-400 font-normal ml-2">{grants.length} found</span>
            </h2>
          </div>

          {grants.map((grant) => {
            const isLive = grant.sourceUrl.includes("grants.gov");
            return (
              <Card key={grant.id} hover className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="neutral">{grant.category}</Badge>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <Zap size={10} />
                          Live
                        </span>
                      )}
                      {grant.matchScore != null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          grant.matchScore >= 85 ? "bg-green-100 text-green-700" :
                          grant.matchScore >= 60 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {grant.matchScore}% match
                        </span>
                      )}
                      {grant.dataQuality === "UNCERTAIN" && (
                        <Badge variant="warning">Uncertain data</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{grant.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">{grant.funder}</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{grant.description}</p>
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    {(grant.awardMin != null || grant.awardMax != null) && (
                      <div>
                        <p className="text-xs text-gray-400">Award</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {grant.awardMin != null && grant.awardMax != null
                            ? `${formatCurrency(grant.awardMin)} – ${formatCurrency(grant.awardMax)}`
                            : formatCurrency((grant.awardMax ?? grant.awardMin)!)}
                        </p>
                      </div>
                    )}
                    {grant.deadline && (
                      <div>
                        <p className="text-xs text-gray-400">Deadline</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDate(grant.deadline)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <a
                    href={grant.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors"
                  >
                    <ExternalLink size={12} />
                    {isLive ? "View on Grants.gov" : "View source"}
                  </a>
                  <Link href={`/grants/${grant.id}`}>
                    <Button size="sm" variant="secondary" iconRight={<ArrowRight size={13} />}>
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}

          {grants.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No grants found</p>
              <p className="text-xs mt-1">
                {query
                  ? `No results for "${query}" — try Search Live to pull from Grants.gov.`
                  : "No active grants in database. Use Search Live to fetch from Grants.gov."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

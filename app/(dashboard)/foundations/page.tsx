import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { ExternalLink, Landmark, Search, BookmarkPlus, Lock } from "lucide-react";
import {
  formatBigMoney, formatTaxPeriod, KIND_LABELS, US_STATES, type FoundationKind,
} from "@/lib/foundations/bmf";
import {
  FREE_RESULT_LIMIT, PAGE_SIZE, filingsUrl, loadedStates, searchFoundations,
} from "@/lib/foundations/search";
import { billingEnabled, planFor } from "@/lib/billing/entitlements";
import { PRO_PRICE_LABEL } from "@/lib/billing/plans";

export const metadata = { title: "Foundation Finder" };
export const dynamic = "force-dynamic";

const ASSET_OPTIONS = [
  { value: "", label: "Any size" },
  { value: "100000", label: "$100K+ in assets" },
  { value: "1000000", label: "$1M+ in assets" },
  { value: "10000000", label: "$10M+ in assets" },
  { value: "100000000", label: "$100M+ in assets" },
];

interface SearchParams { q?: string; state?: string; kind?: string; min?: string; page?: string }

export default async function FoundationsPage(props: { searchParams?: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");
  if (!session.user.organizationId) redirect("/profile");

  const [states, org, plan] = await Promise.all([
    loadedStates(),
    prisma.organization.findUnique({ where: { id: session.user.organizationId }, select: { state: true } }),
    planFor(session.user.id, session.user.organizationId),
  ]);

  const stateCodes = states.map((s) => s.state);
  const orgState = org?.state?.trim().toUpperCase();
  // Default to the organization's own state when we have data for it.
  const state =
    searchParams?.state !== undefined
      ? searchParams.state
      : orgState && stateCodes.includes(orgState)
      ? orgState
      : stateCodes.length === 1
      ? stateCodes[0]
      : "";

  const limited = billingEnabled() && plan === "FREE";
  const query = {
    q: searchParams?.q ?? "",
    state,
    kind: searchParams?.kind ?? "",
    minAssets: Number(searchParams?.min ?? 0) || 0,
    page: Number(searchParams?.page ?? 0) || 0,
  };
  const result = stateCodes.length
    ? await searchFoundations(query, limited ? FREE_RESULT_LIMIT : undefined)
    : { total: 0, rows: [], page: 0, pageSize: PAGE_SIZE };

  const pages = Math.ceil(result.total / PAGE_SIZE);
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (query.q) sp.set("q", query.q);
    sp.set("state", query.state);
    if (query.kind) sp.set("kind", query.kind);
    if (query.minAssets) sp.set("min", String(query.minAssets));
    if (p) sp.set("page", String(p));
    return `/foundations?${sp.toString()}`;
  };
  const refreshed = states.map((s) => s.refreshedAt).filter(Boolean).sort().pop();

  return (
    <div>
      <Topbar title="Foundation Finder" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <Card>
          <form method="GET" action="/foundations" className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <label className="md:col-span-4 block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Name or city</span>
              <input
                name="q"
                defaultValue={query.q}
                placeholder="e.g. community foundation, Rushville"
                className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="md:col-span-2 block">
              <span className="block text-xs font-medium text-gray-600 mb-1">State</span>
              <select name="state" defaultValue={query.state} className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm bg-white">
                {stateCodes.length !== 1 && <option value="">All loaded</option>}
                {stateCodes.map((s) => (
                  <option key={s} value={s}>{US_STATES[s] ?? s}</option>
                ))}
              </select>
            </label>
            <label className="md:col-span-3 block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Type</span>
              <select name="kind" defaultValue={query.kind} className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm bg-white">
                <option value="">All funders</option>
                {Object.entries(KIND_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="md:col-span-2 block">
              <span className="block text-xs font-medium text-gray-600 mb-1">Size</span>
              <select name="min" defaultValue={query.minAssets ? String(query.minAssets) : ""} className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm bg-white">
                {ASSET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-1">
              <Button type="submit" icon={<Search size={14} />} className="w-full">Find</Button>
            </div>
          </form>
        </Card>

        {stateCodes.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center py-10 text-center">
              <Landmark size={28} className="text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-700">Foundation data has not been loaded yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                The list of foundations comes from public IRS records and is loaded by the site
                administrator from Settings. Once loaded, it refreshes monthly.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{result.total.toLocaleString()}</span>{" "}
                funder{result.total === 1 ? "" : "s"} found, largest first
              </p>
              <p className="text-xs text-gray-400">
                Source: IRS Exempt Organizations Business Master File
                {refreshed ? ` · refreshed ${formatDate(refreshed)}` : ""}
              </p>
            </div>

            <Card padding="none">
              {result.rows.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">
                  No funders match. Try a shorter name, another type, or a smaller size.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {result.rows.map((f) => (
                    <li key={f.ein} className="flex items-start gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Landmark size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {KIND_LABELS[f.kind as FoundationKind] ?? f.kind}
                          {f.city ? ` · ${f.city}, ${f.state}` : ""}
                          {f.rulingYear ? ` · since ${f.rulingYear}` : ""}
                        </p>
                        <p className="text-xs text-gray-600 mt-1.5">
                          <span className="font-medium text-gray-800">Assets {formatBigMoney(f.assets)}</span>
                          {f.income !== null && <> · Income {formatBigMoney(f.income)}</>}
                          {formatTaxPeriod(f.taxPeriod) && <> · return for period ending {formatTaxPeriod(f.taxPeriod)}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={filingsUrl(f.ein)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                        >
                          Tax returns <ExternalLink size={12} />
                        </a>
                        <form action="/api/foundations/save" method="POST">
                          <input type="hidden" name="ein" value={f.ein} />
                          <Button type="submit" size="sm" icon={<BookmarkPlus size={14} />}>Save as prospect</Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {limited && result.total > result.rows.length && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-brand-200 bg-brand-50 px-5 py-4">
                <p className="text-sm text-brand-800 flex items-center gap-2">
                  <Lock size={15} className="shrink-0" />
                  The Free plan shows the {FREE_RESULT_LIMIT} largest matches. Pro ({PRO_PRICE_LABEL}) shows all{" "}
                  {result.total.toLocaleString()}.
                </p>
                <Link href="/settings"><Button size="sm">See plans</Button></Link>
              </div>
            )}

            {!limited && pages > 1 && (
              <div className="flex items-center justify-between text-sm">
                {result.page > 0 ? (
                  <Link href={pageHref(result.page - 1)} className="text-brand-600 font-medium">← Previous</Link>
                ) : <span />}
                <span className="text-gray-500">Page {result.page + 1} of {pages}</span>
                {result.page + 1 < pages ? (
                  <Link href={pageHref(result.page + 1)} className="text-brand-600 font-medium">Next →</Link>
                ) : <span />}
              </div>
            )}

            <p className="text-xs text-gray-400 leading-relaxed">
              IRS records show that a funder exists and how large it is. They do not show what it funds
              or whether it accepts applications — open its tax returns or website to confirm before applying.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

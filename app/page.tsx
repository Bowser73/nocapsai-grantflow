import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { Logo } from "@/components/brand/logo";
import { ApplicationSheet } from "@/components/marketing/application-sheet";
import { billingEnabled } from "@/lib/billing/entitlements";
import { PLAN_LIMITS, PRO_PRICE_LABEL } from "@/lib/billing/plans";
import { US_STATES } from "@/lib/foundations/bmf";

export const dynamic = "force-dynamic";

/** Public landing page. Signed-in visitors go straight to their dashboard. */
export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  // Real numbers only: how many funders are loaded, and for which states.
  let funderCount = 0;
  let funderStates: string[] = [];
  try {
    const groups = await prisma.foundation.groupBy({ by: ["state"], _count: { _all: true } });
    funderCount = groups.reduce((n, g) => n + g._count._all, 0);
    funderStates = groups.map((g) => g.state).filter((s): s is string => !!s);
  } catch {
    // The page must still render if the database is unreachable.
  }
  const funderPlace =
    funderStates.length === 1 ? US_STATES[funderStates[0]] ?? funderStates[0] : `${funderStates.length} states`;
  const paid = billingEnabled();

  const steps = [
    {
      title: "Find funders",
      body:
        funderCount > 0
          ? `Search open federal grants straight from Grants.gov, and ${funderCount.toLocaleString()} foundations and grantmakers in ${funderPlace} from public IRS records.`
          : "Search open federal grants straight from Grants.gov, plus a curated list of state and local funding sources.",
    },
    {
      title: "Check the fit",
      body: "Each opportunity is rated against your organization's profile, with the registrations you would need before you can apply.",
    },
    {
      title: "Draft from your own facts",
      body: "GrantFlow writes each section from your profile and the funder's details. Anything it does not know is highlighted for you to fill in.",
    },
    {
      title: "Export it and submit it yourself",
      body: "Download the application as a Word document, then submit through the funder's own portal. You stay in control of what goes out.",
    },
    {
      title: "Keep every date in view",
      body: "Email reminders arrive 14, 7, 3 and 1 day before a deadline, when it is time to follow up, and before a grant report is due.",
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-brand-800">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:bg-highlight focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="border-b border-rule bg-paper/95 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="focus-ring rounded" aria-label="GrantFlow home"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-brand-700" aria-label="Page sections">
            <a href="#how" className="hover:text-brand-900 focus-ring rounded">How it works</a>
            <a href="#honest" className="hover:text-brand-900 focus-ring rounded">What it will not do</a>
            <a href="#pricing" className="hover:text-brand-900 focus-ring rounded">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="focus-ring rounded px-3 h-10 inline-flex items-center text-sm font-semibold text-brand-700 hover:text-brand-900">
              Log in
            </Link>
            <Link href="/auth/register" className="focus-ring h-10 px-4 inline-flex items-center rounded bg-brand-800 text-white text-sm font-semibold hover:bg-brand-900 whitespace-nowrap">
              <span className="sm:hidden">Sign up free</span>
              <span className="hidden sm:inline">Create a free account</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 md:pt-20 md:pb-28 grid lg:grid-cols-[1.2fr_1fr] gap-14 items-center overflow-x-clip">
          <div>
            <h1 className="font-display font-extrabold tracking-tight text-brand-800 text-[2.3rem] leading-[1.08] sm:text-[2.9rem] xl:text-[3.25rem]" style={{ fontStretch: "108%" }}>
              {["Find the grant.", "Write it honestly.", "Make the deadline."].map((line) => (
                <span key={line} className="flex items-start gap-3 sm:gap-4 lg:whitespace-nowrap">
                  <svg viewBox="0 0 32 32" className="w-[0.82em] h-[0.82em] mt-[0.13em] shrink-0" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="26" height="26" rx="2" stroke="#14213D" strokeWidth="2.5" />
                    <path d="M9 16.5l5 5L24 10" stroke="#FFE04A" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 16.5l5 5L24 10" stroke="#14213D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{line}</span>
                </span>
              ))}
            </h1>
            <p className="mt-7 text-lg leading-relaxed text-brand-700 max-w-[34rem]">
              GrantFlow helps small nonprofits and small businesses find funders, draft applications
              from their own facts, and keep every deadline in view. It never invents a number to
              make an application sound better.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/auth/register" className="focus-ring h-12 px-6 inline-flex items-center rounded bg-brand-800 text-white font-semibold hover:bg-brand-900">
                Create a free account
              </Link>
              <a href="#how" className="focus-ring h-12 px-5 inline-flex items-center rounded border-2 border-brand-800 text-brand-800 font-semibold hover:bg-brand-50">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-brand-500">
              {paid ? "Free to start. No card needed." : "Free during early access. No card needed."}
            </p>
          </div>
          <ApplicationSheet />
        </section>

        {/* ── How it works: the lines of a form ──────────────── */}
        <section id="how" className="border-y border-rule bg-white scroll-mt-16">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20 grid md:grid-cols-[18rem_1fr] gap-10">
            <div>
              <h2 className="font-display font-extrabold text-3xl leading-tight tracking-tight" style={{ fontStretch: "108%" }}>
                From first search to the funder&apos;s answer
              </h2>
              <p className="mt-4 text-brand-600 leading-relaxed">
                Five steps, in the order you would do them anyway. GrantFlow keeps them in one place.
              </p>
            </div>
            <ol className="border-t-2 border-brand-800">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[auto_1fr] gap-x-5 border-b border-rule py-5">
                  <span className="line-no" aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3 className="font-display font-bold text-lg text-brand-800">{s.title}</h3>
                    <p className="mt-1 text-brand-600 leading-relaxed max-w-[38rem]">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── What it will not do ────────────────────────────── */}
        <section id="honest" className="mx-auto max-w-6xl px-5 py-16 md:py-24 scroll-mt-16">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl leading-tight tracking-tight max-w-[26rem]" style={{ fontStretch: "108%" }}>
            What GrantFlow will not do
          </h2>
          <p className="mt-4 text-brand-600 leading-relaxed max-w-[38rem]">
            Funders check what you tell them. A tool that pads an application puts your organization&apos;s
            name on claims you cannot back up, so these three limits are built in.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-px bg-brand-800 border-2 border-brand-800">
            {[
              {
                h: "It will not make up facts.",
                p: (
                  <>
                    When your profile does not say how many people you served, the draft says{" "}
                    <span className="hl font-type text-[0.95em]">[VERIFY: number served]</span> and waits for you.
                  </>
                ),
              },
              {
                h: "It will not submit for you.",
                p: <>You read the application, export it, and send it through the funder&apos;s portal. Nothing leaves without you.</>,
              },
              {
                h: "It will not promise an award.",
                p: <>No tool can. GrantFlow helps you send stronger applications to funders that fit, on time.</>,
              },
            ].map((x) => (
              <div key={x.h} className="bg-paper p-7">
                <h3 className="font-display font-bold text-xl text-brand-800">{x.h}</h3>
                <p className="mt-3 text-brand-600 leading-relaxed">{x.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Who it is for ──────────────────────────────────── */}
        <section className="bg-brand-800 text-white">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20 grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight" style={{ fontStretch: "108%" }}>
                For small nonprofits
              </h2>
              <p className="mt-4 text-brand-100 leading-relaxed max-w-[30rem]">
                Community foundations, state programs and federal grants, matched against your mission
                and the people you serve. Built for teams where the grant writer is also the director,
                the bookkeeper and the volunteer coordinator.
              </p>
            </div>
            <div>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight" style={{ fontStretch: "108%" }}>
                For small businesses
              </h2>
              <p className="mt-4 text-brand-100 leading-relaxed max-w-[30rem]">
                Most grant tools ignore businesses. GrantFlow also covers the funding a business can
                actually get: loans and financing programs, government contracts, tax credits and
                federal small-business research awards.
              </p>
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────── */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 md:py-24 scroll-mt-16">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl leading-tight tracking-tight" style={{ fontStretch: "108%" }}>
            Pricing
          </h2>
          {paid ? (
            <>
              <p className="mt-4 text-brand-600 leading-relaxed max-w-[38rem]">
                Start free. Move to Pro when you are running more than a couple of applications.
              </p>
              <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-4xl">
                <div className="border-2 border-brand-800 bg-white p-7">
                  <h3 className="font-display font-bold text-xl">Free</h3>
                  <p className="mt-1 font-display font-extrabold text-4xl">$0</p>
                  <ul className="mt-5 space-y-2.5 text-brand-700">
                    <li>{PLAN_LIMITS.FREE.organizations} organization profile</li>
                    <li>{PLAN_LIMITS.FREE.applications} applications</li>
                    <li>{PLAN_LIMITS.FREE.aiDraftsPerMonth} AI-written sections a month, enough for two full drafts</li>
                    <li>Federal grant search and the 10 largest foundation matches</li>
                    <li>Deadline reminders</li>
                  </ul>
                  <Link href="/auth/register" className="focus-ring mt-7 h-11 px-5 inline-flex items-center rounded border-2 border-brand-800 font-semibold hover:bg-brand-50">
                    Create a free account
                  </Link>
                </div>
                <div className="border-2 border-brand-800 bg-white p-7 shadow-[8px_8px_0_0_#FFE04A]">
                  <h3 className="font-display font-bold text-xl">Pro</h3>
                  <p className="mt-1 font-display font-extrabold text-4xl">
                    {PRO_PRICE_LABEL.split("/")[0]}
                    <span className="text-base font-semibold text-brand-500"> a month</span>
                  </p>
                  <ul className="mt-5 space-y-2.5 text-brand-700">
                    <li>Unlimited organization profiles</li>
                    <li>Unlimited applications</li>
                    <li>{PLAN_LIMITS.PRO.aiDraftsPerMonth} AI-written sections a month</li>
                    <li>Every foundation match, with paging and filters</li>
                    <li>Cancel any time from Settings</li>
                  </ul>
                  <Link href="/auth/register" className="focus-ring mt-7 h-11 px-5 inline-flex items-center rounded bg-brand-800 text-white font-semibold hover:bg-brand-900">
                    Start free, upgrade when ready
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-8 border-2 border-brand-800 bg-white p-7 max-w-2xl shadow-[8px_8px_0_0_#FFE04A]">
              <h3 className="font-display font-bold text-xl">Free during early access</h3>
              <p className="mt-3 text-brand-700 leading-relaxed">
                Every feature is open while GrantFlow is in early access. Paid plans will be announced
                to account holders before anything changes.
              </p>
              <Link href="/auth/register" className="focus-ring mt-6 h-11 px-5 inline-flex items-center rounded bg-brand-800 text-white font-semibold hover:bg-brand-900">
                Create a free account
              </Link>
            </div>
          )}
        </section>

        {/* ── Closing ────────────────────────────────────────── */}
        <section className="border-t border-rule bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="font-display font-extrabold text-3xl tracking-tight" style={{ fontStretch: "108%" }}>
                Set up your organization in about ten minutes
              </h2>
              <p className="mt-3 text-brand-600 leading-relaxed max-w-[36rem]">
                Add your mission, programs and service area once. Every search and every draft uses it from then on.
              </p>
            </div>
            <Link href="/auth/register" className="focus-ring h-12 px-6 inline-flex items-center rounded bg-brand-800 text-white font-semibold hover:bg-brand-900 shrink-0">
              Create a free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-brand-600">
          <Logo />
          <p>
            GrantFlow is made by{" "}
            <a href="https://nocapsai.com/" className="underline hover:text-brand-900 focus-ring rounded">NoCapsAI LLC</a>{" "}
            in Rushville, Indiana. Questions:{" "}
            <a href="mailto:info@nocapsai.com" className="underline hover:text-brand-900 focus-ring rounded">info@nocapsai.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

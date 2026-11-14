import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

/**
 * Shared frame for the log-in and sign-up pages, in NoCapsAI brand:
 * the horse-on-elephant artwork behind a dark veil, the NoCapsAI logo,
 * mint accents, and the form on a clean white card so it stays easy to read.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="nc-auth relative min-h-screen overflow-hidden bg-[#06151c] text-[#f2f8f5]">
      {/* Brand backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/nocapsai-hero.webp)" }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-0"
        style={{ background: "radial-gradient(circle at 50% 30%, rgba(0,0,0,.45) 0%, rgba(0,8,16,.9) 100%)" }}
      />
      <div aria-hidden="true" className="nc-orbits pointer-events-none fixed inset-0 -z-0"><i /><i /></div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,30rem)_1fr] lg:gap-16">
        <div className="flex flex-col">
          {/* Brand bar */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="focus-ring inline-flex items-center gap-2.5 rounded" aria-label="GrantFlow home">
              <LogoMark tone="light" />
              <span className="font-display text-[19px] font-extrabold tracking-tight text-white" style={{ fontStretch: "112%" }}>
                GrantFlow
              </span>
            </Link>
            <a
              href="https://nocapsai.com"
              className="inline-flex items-center gap-2 rounded-full border border-[#2d5e4e] bg-[#06151ccc] py-1 pl-1 pr-3 text-xs font-bold text-[#a5bbb9] hover:border-[#00ec95] hover:text-[#00ec95]"
            >
              <span className="flex">
                {[3, 1, 2].map((n) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={n} src={`/brand/nocapsai-logo-${n}.webp`} alt="" width={24} height={24} className="-mr-1.5 h-6 w-6 rounded-full border-2 border-[#06151c] object-cover" />
                ))}
              </span>
              <span className="ml-1.5">by NoCapsAI</span>
            </a>
          </div>

          {/* Form card */}
          <div className="overflow-hidden rounded-2xl border border-[#00ec95]/60 bg-white text-gray-900 shadow-[0_24px_70px_rgba(0,0,0,.55),0_0_60px_rgba(0,236,149,.12)]">
            <div className="border-b border-[#25434a] bg-gradient-to-r from-[#12342d] to-[#0a222b] px-6 py-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#00ec95]">GrantFlow by NoCapsAI</p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white" style={{ fontStretch: "108%" }}>
                {title}
              </h1>
              <p className="mt-1 text-sm text-[#c5d6d3]">{subtitle}</p>
            </div>
            <div className="px-6 py-6">{children}</div>
          </div>
          <div className="nc-auth-footer mt-5 text-sm text-[#c5d6d3]">{footer}</div>
        </div>

        {/* Promise panel */}
        <aside className="hidden flex-col justify-center rounded-2xl border border-[#2d5e4e] bg-[#06151cb8] p-10 backdrop-blur-md lg:flex">
          <p className="mb-4 text-xs font-bold uppercase tracking-[.12em] text-[#00ec95]">Your grants. One place.</p>
          <p className="font-display text-4xl font-extrabold leading-tight tracking-tight text-white" style={{ fontStretch: "108%" }}>
            Find the grant. Write it honestly. <span className="text-[#00ec95]">Make the deadline.</span>
          </p>
          <ul className="mt-8 space-y-4 leading-relaxed text-[#d6e6e2]">
            <li className="flex gap-3"><span className="font-extrabold text-[#00ec95]">✓</span><span>Live federal grant search and foundations from public IRS records.</span></li>
            <li className="flex gap-3">
              <span className="font-extrabold text-[#00ec95]">✓</span>
              <span>
                Drafts written from your own facts. Anything unknown is{" "}
                <span className="hl font-semibold text-brand-900">highlighted</span>, never invented.
              </span>
            </li>
            <li className="flex gap-3"><span className="font-extrabold text-[#00ec95]">✓</span><span>Email reminders before every deadline.</span></li>
          </ul>
          <p className="mt-10 border-t border-[#25434a] pt-5 text-sm text-[#a5bbb9]">
            Built in Rushville, Indiana by{" "}
            <a href="https://nocapsai.com" className="font-bold text-[#00ec95] hover:underline">NoCapsAI</a>.
          </p>
        </aside>
      </div>
    </div>
  );
}

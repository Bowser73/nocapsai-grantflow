import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Shared frame for the log-in and sign-up pages: the form on a sheet of
 * ruled paper, with what the product promises beside it on wide screens.
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
    <div className="min-h-screen bg-paper grid lg:grid-cols-[1fr_minmax(0,30rem)_1fr_minmax(0,26rem)]">
      <div className="hidden lg:block" />
      <div className="flex flex-col justify-center px-5 py-10">
        <Link href="/" className="focus-ring rounded self-start mb-8" aria-label="GrantFlow home"><Logo /></Link>
        <div className="border-2 border-brand-800 bg-white">
          <div className="border-b-2 border-brand-800 px-6 py-4">
            <h1 className="font-display font-extrabold text-2xl text-brand-800 tracking-tight" style={{ fontStretch: "108%" }}>
              {title}
            </h1>
            <p className="text-sm text-brand-600 mt-1">{subtitle}</p>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
        <div className="mt-5 text-sm text-brand-600">{footer}</div>
      </div>
      <div className="hidden lg:block" />
      <aside className="hidden lg:flex flex-col justify-center bg-brand-800 text-white px-10 py-12">
        <p className="font-display font-extrabold text-3xl leading-tight tracking-tight" style={{ fontStretch: "108%" }}>
          Find the grant. Write it honestly. Make the deadline.
        </p>
        <ul className="mt-8 space-y-4 text-brand-100 leading-relaxed">
          <li>Live federal grant search and foundations from public IRS records.</li>
          <li>
            Drafts written from your own facts. Anything unknown is{" "}
            <span className="hl text-brand-900 font-semibold">highlighted</span>, never invented.
          </li>
          <li>Email reminders before every deadline.</li>
        </ul>
      </aside>
    </div>
  );
}

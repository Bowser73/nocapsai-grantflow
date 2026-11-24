import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { isAdminEmail } from "@/lib/foundations/import";
export default async function Reports() {
  const s = await auth();
  if (!s?.user?.id) redirect("/auth/login");
  if (!isAdminEmail(s.user.email)) notFound();
  const reports = await prisma.aIContentReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <main className="p-6 space-y-5">
      <h1 className="text-2xl font-bold">AI content reports</h1>
      <p>
        Review reported drafts and address unsafe, offensive or inaccurate
        content.
      </p>
      {reports.map((r) => (
        <article key={r.id} className="border rounded p-4 space-y-2">
          <h2>
            {r.reason} · {r.createdAt.toISOString()}
          </h2>
          <p>{r.note}</p>
          <pre className="whitespace-pre-wrap">{r.contentSnapshot}</pre>
          <p className="text-xs">Section: {r.sectionId}</p>
        </article>
      ))}
    </main>
  );
}

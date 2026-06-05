import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { OrgDocumentsPanel } from "@/components/profile/org-documents-panel";

export const metadata = { title: "Documents Library" };

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/profile");

  const documents = await prisma.organizationDocument.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Topbar title="Documents Library" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-4xl mx-auto">
        <OrgDocumentsPanel
          organizationId={session.user.organizationId}
          documents={documents}
        />
      </div>
    </div>
  );
}

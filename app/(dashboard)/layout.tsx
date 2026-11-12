import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getUserOrgs } from "@/lib/user-orgs";
import { Sidebar } from "@/components/ui/sidebar";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  noStore();

  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Load all orgs this user has access to for the profile switcher
  const orgs = session.user.id ? await getUserOrgs(session.user.id) : [];
  const unreadNotifications = session.user.id
    ? await prisma.notification.count({ where: { userId: session.user.id, isRead: false } })
    : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        orgs={orgs}
        activeOrgId={session.user.organizationId}
        unreadNotifications={unreadNotifications}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { Topbar } from "@/components/ui/topbar";
import { Card } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";
import { Bell } from "lucide-react";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Opening the page marks everything shown as read. The list above was read
  // first, so unread items still show their "New" marker on this visit.
  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
  if (unreadIds.length) {
    await prisma.notification.updateMany({
      where: { id: { in: unreadIds }, userId: session.user.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return (
    <div>
      <Topbar title="Notifications" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-3xl mx-auto">
        <Card padding="none">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center px-6">
              <Bell size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-600">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Deadline, follow-up, and report reminders for your applications appear here.
                Manage reminder emails in <Link href="/settings" className="underline">Settings</Link>.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const body = (
                  <div className="flex items-start gap-3 px-5 py-4">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? "bg-gray-200" : "bg-brand-500"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {n.title}
                        {!n.isRead && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand-600">New</span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} className="block hover:bg-gray-50 transition-colors">{body}</Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

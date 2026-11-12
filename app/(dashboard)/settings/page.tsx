import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/ui/topbar";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/db/prisma";
import { isEmailConfigured } from "@/lib/email/send";
import { ReminderSettings } from "@/components/settings/reminder-settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailReminders: true },
  });
  if (!dbUser) redirect("/auth/login");

  return (
    <div>
      <Topbar title="Settings" userName={session.user.name ?? undefined} />
      <div className="p-6 max-w-2xl mx-auto space-y-5">
        {/* User settings */}
        <Card>
          <CardTitle className="mb-4">Account</CardTitle>
          <div className="space-y-4">
            <Input label="Name" defaultValue={session.user.name ?? ""} disabled />
            <Input label="Email" defaultValue={session.user.email ?? ""} disabled />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Role</p>
              <Badge>{session.user.role}</Badge>
            </div>
          </div>
        </Card>

        {/* API Keys */}
        <Card>
          <CardTitle className="mb-2">API Configuration</CardTitle>
          <p className="text-xs text-gray-500 mb-4">
            API keys are set in your server environment (.env file), not stored in the database.
          </p>
          <div className="space-y-3">
            <SettingRow
              label="OpenAI API Key"
              value={process.env.OPENAI_API_KEY ? "••••••••••••••" : "Not configured"}
              status={!!process.env.OPENAI_API_KEY}
            />
            <SettingRow
              label="Grants.gov API"
              value="Free — no key required"
              status={true}
            />
            <SettingRow
              label="Email (Resend)"
              value={isEmailConfigured() ? "Configured" : "Not configured"}
              status={isEmailConfigured()}
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardTitle className="mb-4">Reminders</CardTitle>
          <ReminderSettings
            initialEnabled={dbUser.emailReminders}
            emailConfigured={isEmailConfigured()}
            email={dbUser.email}
          />
        </Card>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">{value}</span>
        <span
          className={`w-2 h-2 rounded-full ${status ? "bg-green-400" : "bg-gray-300"}`}
          title={status ? "Configured" : "Not configured"}
        />
      </div>
    </div>
  );
}

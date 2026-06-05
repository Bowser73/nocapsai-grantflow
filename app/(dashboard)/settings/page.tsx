import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/ui/topbar";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

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
              value={process.env.RESEND_API_KEY ? "Configured" : "Not configured"}
              status={!!process.env.RESEND_API_KEY}
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardTitle className="mb-2">Notifications</CardTitle>
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-md p-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Email notifications will be active once you configure a Resend API key and FROM
              email address in your .env file. In-app notifications are always active.
            </p>
          </div>
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

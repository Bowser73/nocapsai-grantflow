import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/ui/topbar";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/db/prisma";
import { isEmailConfigured } from "@/lib/email/send";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { BillingPanel } from "@/components/settings/billing-panel";
import { entitlementsFor } from "@/lib/billing/entitlements";
import { PLAN_LIMITS, PRO_PRICE_LABEL } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";
import { FoundationImportPanel } from "@/components/foundations/import-panel";
import { configuredStates, isAdminEmail } from "@/lib/foundations/import";
import { loadedStates } from "@/lib/foundations/search";
import { US_STATES } from "@/lib/foundations/bmf";

const LIMIT_NOTICES: Record<string, string> = {
  applications: `The Free plan includes ${PLAN_LIMITS.FREE.applications} applications per organization. Upgrade to Pro (${PRO_PRICE_LABEL}) to start another.`,
  aiDrafts: `That would go past this month's AI drafting allowance on your plan. Upgrade to Pro (${PRO_PRICE_LABEL}) for more, or wait until the 1st.`,
  organizations: `The Free plan includes ${PLAN_LIMITS.FREE.organizations} organization profile. Upgrade to Pro (${PRO_PRICE_LABEL}) to add another.`,
};

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { billing?: string; limit?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      emailReminders: true,
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!dbUser) redirect("/auth/login");

  const isAdmin = isAdminEmail(dbUser.email);
  const foundationStates = isAdmin ? await loadedStates() : [];
  const entitlements = await entitlementsFor(session.user.id, session.user.organizationId);
  const notice =
    searchParams?.billing === "success"
      ? { tone: "good" as const, text: "Thanks — your payment went through. Pro switches on within a minute; refresh this page if it still shows Free." }
      : searchParams?.billing === "cancelled"
      ? { tone: "warn" as const, text: "Checkout was cancelled. You have not been charged." }
      : searchParams?.limit && LIMIT_NOTICES[searchParams.limit]
      ? { tone: "warn" as const, text: LIMIT_NOTICES[searchParams.limit] }
      : null;

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

        {/* Plan & billing */}
        <Card>
          <CardTitle className="mb-4">Plan &amp; billing</CardTitle>
          <BillingPanel
            enabled={entitlements.enforced}
            plan={entitlements.plan}
            storedPlan={dbUser.plan}
            subscriptionStatus={dbUser.subscriptionStatus}
            renewsOn={dbUser.currentPeriodEnd ? formatDate(dbUser.currentPeriodEnd) : null}
            hasBillingAccount={!!dbUser.stripeCustomerId}
            hasSubscription={!!dbUser.stripeSubscriptionId}
            limits={entitlements.limits}
            usage={entitlements.usage}
            notice={notice}
          />
        </Card>

        {/* Foundation data (site administrators only) */}
        {isAdmin && (
          <Card>
            <CardTitle className="mb-3">Foundation data</CardTitle>
            <FoundationImportPanel
              states={Object.entries(US_STATES).map(([code, name]) => ({ code, name }))}
              loaded={foundationStates.map((s) => ({
                state: s.state,
                count: s.count,
                refreshed: s.refreshedAt ? formatDate(s.refreshedAt) : null,
              }))}
              defaultState={configuredStates()[0]}
            />
          </Card>
        )}

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
              label="Billing (Stripe)"
              value={entitlements.enforced ? "Configured" : "Not configured"}
              status={entitlements.enforced}
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

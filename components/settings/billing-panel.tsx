"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PRO_PRICE_LABEL, type EffectivePlan, type PlanLimits } from "@/lib/billing/plans";

interface Props {
  enabled: boolean;              // billing switched on for this deployment
  plan: EffectivePlan;
  storedPlan: string;            // FREE | PRO | COMP
  subscriptionStatus: string | null;
  renewsOn: string | null;       // preformatted date
  hasBillingAccount: boolean;
  limits: PlanLimits;
  usage: { organizations: number; applications: number; aiDraftsThisMonth: number };
  notice: { tone: "good" | "warn"; text: string } | null;
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={full ? "font-semibold text-amber-700" : "text-gray-500"}>
          {used} {limit === null ? "· no limit" : `of ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${full ? "bg-amber-500" : "bg-brand-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function BillingPanel(props: Props) {
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(kind: "checkout" | "portal") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/billing/${kind}`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error ?? "Something went wrong. Please try again.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(null);
    }
  }

  const planName =
    props.storedPlan === "COMP" ? "Pro (complimentary)" : props.plan === "PRO" ? "Pro" : "Free";

  return (
    <div className="space-y-4">
      {props.notice && (
        <p
          className={`text-xs rounded-md p-3 border ${
            props.notice.tone === "good"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {props.notice.text}
        </p>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{planName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {!props.enabled
              ? "Paid plans are not switched on yet, so every feature is available to all accounts."
              : props.storedPlan === "COMP"
              ? "Full access at no charge."
              : props.plan === "PRO"
              ? props.subscriptionStatus === "past_due"
                ? "Your last payment did not go through. Update your card to keep Pro."
                : props.renewsOn
                ? `${PRO_PRICE_LABEL} · next billing date ${props.renewsOn}`
                : PRO_PRICE_LABEL
              : `Pro is ${PRO_PRICE_LABEL}: unlimited organization profiles and applications, and far more AI drafting.`}
          </p>
        </div>
        {props.enabled && props.plan === "FREE" && (
          <Button onClick={() => go("checkout")} loading={busy === "checkout"} disabled={busy !== null}>
            Upgrade to Pro
          </Button>
        )}
        {props.enabled && props.hasBillingAccount && props.storedPlan === "PRO" && (
          <Button variant="secondary" onClick={() => go("portal")} loading={busy === "portal"} disabled={busy !== null}>
            Manage billing
          </Button>
        )}
      </div>

      {props.enabled && (
        <div className="space-y-3 pt-1">
          <Meter label="Organization profiles" used={props.usage.organizations} limit={props.limits.organizations} />
          <Meter label="Applications in this organization" used={props.usage.applications} limit={props.limits.applications} />
          <Meter label="AI-written sections this month" used={props.usage.aiDraftsThisMonth} limit={props.limits.aiDraftsPerMonth} />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

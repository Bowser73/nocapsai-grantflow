import assert from "node:assert/strict";
import {
  bestPlan, checkLimit, effectivePlan, planAfterSubscriptionChange, startOfMonthUTC, PLAN_LIMITS,
} from "@/lib/billing/plans";

// effective plan
assert.equal(effectivePlan(null), "FREE");
assert.equal(effectivePlan({ plan: "FREE", subscriptionStatus: null }), "FREE");
assert.equal(effectivePlan({ plan: "COMP", subscriptionStatus: null }), "PRO", "complimentary accounts have full access");
assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "active" }), "PRO");
assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "trialing" }), "PRO");
assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "past_due" }), "PRO", "access continues while Stripe retries the card");
assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "canceled" }), "FREE");
assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: "unpaid" }), "FREE");
assert.equal(effectivePlan({ plan: "PRO", subscriptionStatus: null }), "FREE", "PRO without a live subscription is not trusted");

assert.equal(bestPlan("FREE", "PRO"), "PRO");
assert.equal(bestPlan("FREE", "FREE"), "FREE");

// stored plan transitions
assert.equal(planAfterSubscriptionChange("FREE", "active"), "PRO");
assert.equal(planAfterSubscriptionChange("PRO", "canceled"), "FREE");
assert.equal(planAfterSubscriptionChange("PRO", "incomplete_expired"), "FREE");
assert.equal(planAfterSubscriptionChange("COMP", "canceled"), "COMP", "billing events never remove complimentary access");
assert.equal(planAfterSubscriptionChange("COMP", "active"), "COMP");

// limits
assert.equal(checkLimit("organizations", "FREE", 0).allowed, true);
assert.equal(checkLimit("organizations", "FREE", 1).allowed, false);
assert.equal(checkLimit("organizations", "PRO", 50).allowed, true);
assert.equal(checkLimit("applications", "FREE", 1).allowed, true);
assert.equal(checkLimit("applications", "FREE", 2).allowed, false);
assert.match(checkLimit("applications", "FREE", 2).message!, /Upgrade to Pro/);
assert.equal(checkLimit("applications", "PRO", 999).allowed, true);

const free = PLAN_LIMITS.FREE.aiDraftsPerMonth;
assert.equal(checkLimit("aiDrafts", "FREE", 0, 11).allowed, true, "one full application fits in the free allowance");
assert.equal(checkLimit("aiDrafts", "FREE", 11, 11).allowed, true, "two full applications fit");
assert.equal(checkLimit("aiDrafts", "FREE", free - 1, 1).allowed, true);
assert.equal(checkLimit("aiDrafts", "FREE", free, 1).allowed, false);
assert.equal(checkLimit("aiDrafts", "FREE", free - 5, 11).allowed, false, "a batch that would overshoot is refused up front");
assert.equal(checkLimit("aiDrafts", "PRO", 499, 1).allowed, true);
const proCap = checkLimit("aiDrafts", "PRO", 500, 1);
assert.equal(proCap.allowed, false);
assert.doesNotMatch(proCap.message!, /Upgrade/, "Pro users are not told to upgrade");

assert.equal(startOfMonthUTC(new Date("2026-11-11T19:46:00Z")).toISOString(), "2026-11-01T00:00:00.000Z");

console.log("check-billing: all assertions passed");

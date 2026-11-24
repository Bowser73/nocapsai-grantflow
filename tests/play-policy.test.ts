import test from "node:test";
import assert from "node:assert/strict";
import { playEntitlement, PLAY_PRODUCT } from "../lib/billing/play-policy";
const now = Date.parse("2026-11-24T12:00:00Z");
const future = new Date(now + 3600000).toISOString();
for (const state of [
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
])
  test(state + " preserves paid access before expiry", () =>
    assert.equal(
      playEntitlement(
        {
          subscriptionState: state,
          lineItems: [{ productId: PLAY_PRODUCT, expiryTime: future }],
        },
        now,
      ).active,
      true,
    ),
  );
for (const state of [
  "SUBSCRIPTION_STATE_PENDING",
  "SUBSCRIPTION_STATE_ON_HOLD",
  "SUBSCRIPTION_STATE_PAUSED",
  "SUBSCRIPTION_STATE_EXPIRED",
  "SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED",
  "UNKNOWN",
])
  test(state + " never grants access", () =>
    assert.equal(
      playEntitlement(
        {
          subscriptionState: state,
          lineItems: [{ productId: PLAY_PRODUCT, expiryTime: future }],
        },
        now,
      ).active,
      false,
    ),
  );
test("expired canceled subscription loses access", () =>
  assert.equal(
    playEntitlement(
      {
        subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
        lineItems: [
          { productId: PLAY_PRODUCT, expiryTime: new Date(now).toISOString() },
        ],
      },
      now,
    ).active,
    false,
  ));
test("wrong product does not grant access", () =>
  assert.equal(
    playEntitlement(
      {
        subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
        lineItems: [{ productId: "other_app", expiryTime: future }],
      },
      now,
    ).active,
    false,
  ));
test("malformed expiry does not grant access", () =>
  assert.equal(
    playEntitlement(
      {
        subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
        lineItems: [{ productId: PLAY_PRODUCT, expiryTime: "invalid" }],
      },
      now,
    ).active,
    false,
  ));

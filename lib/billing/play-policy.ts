export const PLAY_PACKAGE = "com.nocapsai.grantflow";
export const PLAY_PRODUCT = "grantflow_pro";
export interface PlaySnapshot {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
}
export function playEntitlement(s: PlaySnapshot, now = Date.now()) {
  const item = s.lineItems?.find((i) => i.productId === PLAY_PRODUCT);
  const expiry = item?.expiryTime ? new Date(item.expiryTime) : null;
  const states = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ];
  return {
    active:
      !!expiry &&
      Number.isFinite(expiry.getTime()) &&
      expiry.getTime() > now &&
      states.includes(s.subscriptionState || ""),
    expiry,
    state: s.subscriptionState || "UNKNOWN",
    acknowledged:
      s.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
  };
}

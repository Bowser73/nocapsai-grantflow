import {
  createHash,
  createSign,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import prisma from "@/lib/db/prisma";
import {
  PLAY_PACKAGE,
  PLAY_PRODUCT,
  playEntitlement,
  type PlaySnapshot,
} from "./play-policy";
export function playBillingEnabled() {
  return (
    process.env.GOOGLE_PLAY_BILLING_ENABLED === "true" &&
    !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON &&
    !!process.env.GOOGLE_PLAY_TOKEN_KEY
  );
}
export const playAccountId = (id: string) =>
  createHash("sha256")
    .update("grantflow-play:" + id)
    .digest("hex");
function key() {
  const k = Buffer.from(process.env.GOOGLE_PLAY_TOKEN_KEY || "", "base64");
  if (k.length !== 32)
    throw Error("Invalid Play token encryption configuration");
  return k;
}
function seal(s: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key(), iv);
  return Buffer.concat([
    iv,
    c.update(s, "utf8"),
    c.final(),
    c.getAuthTag(),
  ]).toString("base64");
}
function unseal(s: string) {
  const b = Buffer.from(s, "base64"),
    d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(-16));
  return Buffer.concat([d.update(b.subarray(12, -16)), d.final()]).toString(
    "utf8",
  );
}
let cached: { token: string; until: number } | undefined;
async function accessToken() {
  if (cached && cached.until > Date.now()) return cached.token;
  const sa = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "{}");
  if (!sa.client_email || !sa.private_key)
    throw Error("Play verification is not configured");
  const now = Math.floor(Date.now() / 1000),
    enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const input =
    enc({ alg: "RS256", typ: "JWT" }) +
    "." +
    enc({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  const assertion = input + "." + signer.sign(sa.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!r.ok) throw Error("Play verification authorization failed");
  const data = await r.json();
  if (!data.access_token) throw Error("No Play verification authorization");
  cached = { token: data.access_token, until: Date.now() + 3000000 };
  return cached.token;
}
async function google(token: string, ack = false) {
  const root =
    "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
    PLAY_PACKAGE +
    "/purchases/";
  const url = ack
    ? root +
      "subscriptions/" +
      PLAY_PRODUCT +
      "/tokens/" +
      encodeURIComponent(token) +
      ":acknowledge"
    : root + "subscriptionsv2/tokens/" + encodeURIComponent(token);
  const r = await fetch(url, {
    method: ack ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + (await accessToken()),
      "Content-Type": "application/json",
    },
    ...(ack ? { body: "{}" } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw Error("Play verification failed (HTTP " + r.status + ")");
  return ack ? {} : ((await r.json()) as PlaySnapshot);
}
export async function verifyPlayPurchase(userId: string, token: string) {
  if (!playBillingEnabled()) throw Error("Google Play billing is not enabled");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const existing = await prisma.playSubscription.findUnique({
    where: { tokenHash },
  });
  if (existing && existing.userId !== userId)
    throw Error("This purchase belongs to another GrantFlow account");
  const snapshot = (await google(token)) as PlaySnapshot,
    ent = playEntitlement(snapshot);
  if (!snapshot.lineItems?.some((i) => i.productId === PLAY_PRODUCT))
    throw Error("Unexpected subscription product");
  const external =
    snapshot.externalAccountIdentifiers?.obfuscatedExternalAccountId;
  if (external && external !== playAccountId(userId))
    throw Error("Purchase account does not match");
  if (snapshot.linkedPurchaseToken) {
    const linked = await prisma.playSubscription.findUnique({
      where: {
        tokenHash: createHash("sha256")
          .update(snapshot.linkedPurchaseToken)
          .digest("hex"),
      },
    });
    if (linked && linked.userId !== userId)
      throw Error("Linked purchase belongs to another account");
  }
  // Reserve ownership before acknowledgement. A unique token hash prevents double claims.
  const row = await prisma.playSubscription.upsert({
    where: { tokenHash },
    create: {
      userId,
      tokenHash,
      encryptedToken: seal(token),
      state: ent.state,
      expiresAt: ent.expiry,
      verifiedAt: new Date(),
    },
    update: { state: ent.state, expiresAt: ent.expiry, verifiedAt: new Date() },
  });
  if (row.userId !== userId) throw Error("Purchase ownership conflict");
  if (ent.active && !ent.acknowledged) await google(token, true);
  return { active: ent.active, expiresAt: ent.expiry, state: ent.state };
}
export async function playPlanFor(userId: string): Promise<"FREE" | "PRO"> {
  if (!playBillingEnabled()) return "FREE";
  const rows = await prisma.playSubscription.findMany({
    where: { userId },
    orderBy: { verifiedAt: "desc" },
    take: 20,
  });
  for (const row of rows) {
    let state = row.state,
      expiry = row.expiresAt;
    if (Date.now() - row.verifiedAt.getTime() > 300000) {
      try {
        const fresh = await verifyPlayPurchase(
          userId,
          unseal(row.encryptedToken),
        );
        state = fresh.state;
        expiry = fresh.expiresAt;
      } catch {
        continue;
      } // Don't grant access from an unverified stale purchase.
    }
    if (
      [
        "SUBSCRIPTION_STATE_ACTIVE",
        "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
        "SUBSCRIPTION_STATE_CANCELED",
      ].includes(state) &&
      expiry &&
      expiry.getTime() > Date.now()
    )
      return "PRO";
  }
  return "FREE";
}

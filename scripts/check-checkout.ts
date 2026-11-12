/**
 * Integration check: an account can never end up with two subscriptions.
 * Uses a local stand-in for Stripe and a throwaway local database.
 *
 *   npx tsx --env-file=.env scripts/check-checkout.ts
 */
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";

interface FakeSession { id: string; url: string; mode: string; status: string; customer: string }
interface FakeSub { id: string; customer: string; status: string; current_period_end: number }

async function main() {
  assert.match(process.env.DATABASE_URL ?? "", /@(localhost|127\.0\.0\.1)[:/]/, "refusing to run: DATABASE_URL is not a local database");

  const sessions: FakeSession[] = [];
  const subs: FakeSub[] = [];
  const byIdempotencyKey = new Map<string, FakeSession>();
  let customers = 0;

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://stripe.test");
      const json = (o: unknown) => res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(o));
      const list = (data: unknown[]) => json({ object: "list", data, has_more: false, url: url.pathname });

      if (req.method === "POST" && url.pathname === "/v1/customers") {
        return json({ id: `cus_test_${++customers}`, object: "customer" });
      }
      if (req.method === "GET" && url.pathname === "/v1/subscriptions") {
        return list(subs.filter((s) => s.customer === url.searchParams.get("customer")).map((s) => ({ ...s, object: "subscription" })));
      }
      if (req.method === "GET" && url.pathname === "/v1/checkout/sessions") {
        const status = url.searchParams.get("status");
        return list(sessions.filter((s) => s.customer === url.searchParams.get("customer") && (!status || s.status === status)));
      }
      if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
        const key = String(req.headers["idempotency-key"] ?? "");
        const replay = key && byIdempotencyKey.get(key);
        if (replay) return json(replay);
        const s: FakeSession = {
          id: `cs_test_${sessions.length + 1}`,
          url: `https://checkout.stripe.test/pay/cs_test_${sessions.length + 1}`,
          mode: "subscription",
          status: "open",
          customer: new URLSearchParams(body).get("customer") ?? "",
        };
        sessions.push(s);
        if (key) byIdempotencyKey.set(key, s);
        return json(s);
      }
      res.writeHead(404, { "Content-Type": "application/json" }).end('{"error":{"message":"not mocked"}}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.STRIPE_API_HOST = `127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.STRIPE_SECRET_KEY = "sk_test_local";
  process.env.STRIPE_PRICE_ID = "price_test_local";

  const { default: prisma } = await import("@/lib/db/prisma");
  const { startProCheckout } = await import("@/lib/billing/checkout");

  const user = await prisma.user.create({ data: { email: `checkout-${Date.now()}@example.com`, name: "Checkout Test" } });
  const t0 = Date.UTC(2026, 10, 12, 15, 0, 30);

  try {
    // 1. Two tabs, one after the other: the second gets the SAME open checkout.
    const first = await startProCheckout(user.id, t0);
    const second = await startProCheckout(user.id, t0 + 5_000);
    assert.equal(first.kind, "url");
    assert.deepEqual(second, first);
    assert.equal(sessions.length, 1, "only one checkout session exists");
    assert.equal(customers, 1, "only one Stripe customer is created");

    // 2. Two requests at the same instant (neither can see the other's session
    //    yet): the shared idempotency key still yields a single session.
    sessions.length = 0;
    const racedA = await startProCheckout(user.id, t0 + 60_000);
    sessions.length = 0; // simulate the list call not yet seeing the session
    const racedB = await startProCheckout(user.id, t0 + 60_001);
    assert.deepEqual(racedB, racedA, "simultaneous requests resolve to one session");

    // 3. The checkout was completed but our webhook has not arrived yet: a
    //    further attempt is refused, and the subscription is recorded from Stripe.
    const customerId = (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).stripeCustomerId!;
    sessions.forEach((s) => (s.status = "complete"));
    subs.push({ id: "sub_test_1", customer: customerId, status: "active", current_period_end: 1_800_000_000 });
    const afterPaying = await startProCheckout(user.id, t0 + 120_000);
    assert.equal(afterPaying.kind, "conflict");
    let row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(row.plan, "PRO");
    assert.equal(row.stripeSubscriptionId, "sub_test_1");

    // 4. Payment later fails (unpaid): still no second subscription; the person
    //    is sent to billing management instead.
    subs[0].status = "unpaid";
    const whileUnpaid = await startProCheckout(user.id, t0 + 3_600_000);
    assert.equal(whileUnpaid.kind, "conflict");
    assert.match(whileUnpaid.kind === "conflict" ? whileUnpaid.message : "", /Manage billing/);
    row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(row.plan, "FREE");
    assert.equal(row.stripeSubscriptionId, "sub_test_1", "the subscription stays on file so billing management is offered");

    // 5. Once that subscription is truly over, subscribing again is allowed.
    subs[0].status = "canceled";
    const before = sessions.length;
    const again = await startProCheckout(user.id, t0 + 7_200_000);
    assert.equal(again.kind, "url");
    assert.equal(sessions.length, before + 1);

    console.log("check-checkout: all assertions passed");
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
